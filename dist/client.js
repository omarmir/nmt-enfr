import { applyGlossaryToSegments } from "./glossary.js";
import { prepareDocument, reconstructDocument } from "./document.js";
import { recommendWorkerCount, splitQueueIntoBatches } from "./planning.js";
import { modelForDirection, normalizeDirection, splitTextToSegments } from "./text.js";

const DEFAULT_GENERATION = {
  max_length: 512,
  num_beams: 4,
  early_stopping: true,
};

export function createTranslator(options = {}) {
  return new BrowserTranslator(options);
}

class BrowserTranslator {
  constructor(options = {}) {
    this.options = normalizeClientOptions(options);
    this.events = new Map();
    this.workers = [];
    this.activeModel = null;
    this.activeDtype = null;
    this.modelReady = false;
    this.cancelled = false;
    this.batchQueue = [];
    this.translated = [];
    this.completedCount = 0;
    this.totalSegments = 0;
    this.resolveActive = null;
    this.rejectActive = null;
    this.activeDirection = "en-fr";
    this.activeWorkerCount = 0;
  }

  on(event, handler) {
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this.events.get(event)?.delete(handler);
  }

  emit(event, payload) {
    for (const handler of this.events.get(event) || []) {
      handler(payload);
    }
    this.options.onEvent?.({ type: event, ...payload });
  }

  async loadModel(options = {}) {
    const direction = normalizeDirection(options.direction || this.activeDirection);
    const dtype = options.dtype || this.options.dtype;
    const model = options.model || modelForDirection(direction);
    if (this.modelReady && this.activeModel === model && this.activeDtype === dtype) return { model, direction, dtype };

    this.disposeWorkers(true);
    this.modelReady = false;
    this.activeModel = model;
    this.activeDtype = dtype;
    this.activeDirection = direction;
    const worker = this.createWorker({ initial: true, model });
    worker.worker.postMessage({
      task: "configure",
      config: workerConfig(this.options),
    });
    worker.worker.postMessage({ task: "model", model, dtype });
    await waitForWorkerReady(worker);
    this.modelReady = true;
    return { model, direction, dtype };
  }

  async translateText(text, options = {}) {
    const segments = splitTextToSegments(text);
    const result = await this.translateSegments(segments, options);
    return {
      text: result.segments.join(""),
      segments: result.segments,
      direction: result.direction,
    };
  }

  async translateSegments(segments, options = {}) {
    const direction = normalizeDirection(options.direction || this.activeDirection);
    const dtype = options.dtype || this.options.dtype;
    const generation = { ...DEFAULT_GENERATION, ...this.options.generation, ...options.generation };
    const queue = applyGlossaryToSegments(segments || [], options.glossary || [], direction);
    const translatable = queue.filter((item) => item.shouldTranslate);
    if (!translatable.length) {
      return {
        segments: queue.map((item) => item.text || ""),
        direction,
        completed: queue.length,
        total: queue.length,
      };
    }

    await this.loadModel({ direction, dtype, model: options.model });
    this.cancelled = false;
    this.translated = [];
    this.completedCount = 0;
    this.totalSegments = queue.length;
    for (const item of queue) {
      if (!item.shouldTranslate) {
        this.translated[item.index] = item.text;
        this.completedCount += 1;
      }
    }

    const workerCount = this.desiredWorkerCount(translatable, options.maxWorkers);
    this.batchQueue = splitQueueIntoBatches(translatable, workerCount);
    this.activeWorkerCount = workerCount;
    this.ensureTranslationWorkers(workerCount, modelForDirection(direction));
    this.emitProgress(direction);

    return new Promise((resolve, reject) => {
      this.resolveActive = resolve;
      this.rejectActive = reject;
      this.processQueue({
        direction,
        model: options.model || modelForDirection(direction),
        dtype,
        generation,
      });
    });
  }

  async translateDocument(file, options = {}) {
    this.emit("document-progress", { phase: "prepare", file });
    const context = await prepareDocument(file, { JSZip: options.JSZip || this.options.JSZip });
    const result = await this.translateSegments(context.queue, options);
    this.emit("document-progress", { phase: "reconstruct", file });
    const document = await reconstructDocument(context, result.segments);
    return {
      ...document,
      direction: result.direction,
      segments: result.segments,
    };
  }

  cancel() {
    this.cancelled = true;
    this.disposeWorkers(false);
    this.batchQueue = [];
    this.rejectActive?.(new Error("Translation cancelled."));
    this.resolveActive = null;
    this.rejectActive = null;
  }

  dispose() {
    this.cancel();
    this.disposeWorkers(true);
    this.events.clear();
  }

  desiredWorkerCount(queue, maxWorkers) {
    return recommendWorkerCount({
      segmentCount: queue.length,
      maxWorkers: maxWorkers || this.options.maxWorkers,
      hardwareConcurrency: this.options.hardwareConcurrency,
      deviceMemory: this.options.deviceMemory,
    });
  }

  ensureTranslationWorkers(needed, model) {
    const active = this.workers.filter((worker) => worker.status !== "disposed").length;
    for (let index = active; index < needed; index++) {
      const worker = this.createWorker({ initial: false, model });
      worker.worker.postMessage({
        task: "configure",
        config: workerConfig(this.options),
      });
      worker.worker.postMessage({ task: "model", model, dtype: this.activeDtype });
    }
  }

  createWorker({ initial = false, model }) {
    const worker = new Worker(this.options.workerUrl, { type: "module" });
    const workerState = {
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      worker,
      status: "loading",
      initial,
      model,
      readyWaiters: [],
    };
    this.workers.push(workerState);

    worker.onmessage = (event) => {
      const data = event.data || {};
      if (data.status === "init") return;
      if (data.status === "downloading") {
        this.emit("model-progress", { model: data.model || workerState.model, progress: data.result });
        return;
      }
      if (data.status === "ready") {
        workerState.status = "free";
        workerState.model = data.model || workerState.model;
        for (const waiter of workerState.readyWaiters.splice(0)) waiter.resolve();
        this.processQueue();
        return;
      }
      if (data.status === "result") {
        this.translated[data.index] = data.result || "";
        this.completedCount += 1;
        this.emitProgress(this.activeDirection);
        return;
      }
      if (data.status === "batch-complete") {
        workerState.status = "free";
        this.processQueue();
        return;
      }
      if (data.status === "error") {
        workerState.status = "free";
        const error = new Error(data.error || "Translation failed.");
        for (const waiter of workerState.readyWaiters.splice(0)) waiter.reject(error);
        this.fail(error);
      }
    };

    worker.onerror = (event) => {
      const error = new Error(event.message || "Translation worker failed.");
      workerState.status = "free";
      for (const waiter of workerState.readyWaiters.splice(0)) waiter.reject(error);
      this.fail(error);
    };

    return workerState;
  }

  processQueue(context = null) {
    if (!this.resolveActive || this.cancelled) return;
    if (context) {
      this.activeDirection = context.direction;
      this.activeContext = context;
    }
    const activeContext = this.activeContext;
    if (!activeContext) return;

    while (this.batchQueue.length > 0) {
      const worker = this.workers.find((item) => item.status === "free" && item.model === activeContext.model);
      if (!worker) break;
      const batch = this.batchQueue.shift();
      worker.status = "working";
      worker.worker.postMessage({
        task: "translate-batch",
        batchId: batch.id,
        model: activeContext.model,
        workerId: worker.id,
        items: batch.items,
        dtype: activeContext.dtype,
        generation: activeContext.generation,
      });
    }

    this.checkComplete(activeContext.direction);
  }

  checkComplete(direction) {
    const allIdle = this.workers.every((worker) => worker.status !== "working" && worker.status !== "loading");
    if (this.batchQueue.length > 0 || !allIdle || !this.resolveActive) return;
    const resolve = this.resolveActive;
    this.resolveActive = null;
    this.rejectActive = null;
    this.disposeWorkers(false);
    resolve({
      segments: this.translated,
      direction,
      completed: this.completedCount,
      total: this.totalSegments,
    });
  }

  fail(error) {
    if (!this.rejectActive) return;
    const reject = this.rejectActive;
    this.resolveActive = null;
    this.rejectActive = null;
    this.disposeWorkers(false);
    reject(error);
  }

  emitProgress(direction) {
    this.emit("translation-progress", {
      direction,
      completed: this.completedCount,
      total: this.totalSegments,
      percent: this.totalSegments > 0 ? (this.completedCount / this.totalSegments) * 100 : 0,
      workers: this.activeWorkerCount,
    });
  }

  disposeWorkers(includeInitial = false) {
    for (const item of this.workers) {
      if (item.initial && !includeInitial) continue;
      if (item.status === "disposed") continue;
      item.status = "disposed";
      try {
        item.worker.postMessage({ task: "dispose" });
      } catch {
        // Worker may already be gone.
      }
      item.worker.terminate();
    }
    this.workers = this.workers.filter((worker) => worker.status !== "disposed");
  }
}

function waitForWorkerReady(workerState) {
  if (workerState.status === "free") return Promise.resolve();
  return new Promise((resolve, reject) => {
    workerState.readyWaiters.push({ resolve, reject });
  });
}

function normalizeClientOptions(options) {
  const currentUrl = new URL(import.meta.url);
  return {
    transformersUrl: options.transformersUrl || "https://cdn.jsdelivr.net/npm/@huggingface/transformers/dist/transformers.min.js",
    workerUrl: options.workerUrl || new URL("./worker.js", currentUrl).href,
    wasmBaseUrl: options.wasmBaseUrl || "",
    modelsBaseUrl: options.modelsBaseUrl || "",
    allowRemoteModels: options.allowRemoteModels !== false,
    allowLocalModels: options.allowLocalModels !== false,
    dtype: options.dtype || "q8",
    maxWorkers: Math.max(1, Number(options.maxWorkers) || 1),
    hardwareConcurrency: Number(options.hardwareConcurrency) || globalThis.navigator?.hardwareConcurrency || 1,
    deviceMemory: Number.isFinite(options.deviceMemory) ? options.deviceMemory : globalThis.navigator?.deviceMemory,
    generation: options.generation || {},
    JSZip: options.JSZip,
    onEvent: options.onEvent,
  };
}

function workerConfig(options) {
  return {
    transformersUrl: options.transformersUrl,
    wasmBaseUrl: options.wasmBaseUrl,
    modelsBaseUrl: options.modelsBaseUrl,
    allowRemoteModels: options.allowRemoteModels,
    allowLocalModels: options.allowLocalModels,
  };
}
