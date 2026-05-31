import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, "src"), dist, { recursive: true });
await writeFile(join(dist, "index.d.ts"), `export type Direction = "en-fr" | "fr-en";

export interface GlossaryEntry {
  id?: string;
  english: string;
  french: string;
  enabled?: boolean;
}

export interface GenerationOptions {
  max_length?: number;
  num_beams?: number;
  early_stopping?: boolean;
}

export interface TranslatorOptions {
  transformersUrl?: string;
  workerUrl?: string;
  wasmBaseUrl?: string;
  modelsBaseUrl?: string;
  allowRemoteModels?: boolean;
  allowLocalModels?: boolean;
  dtype?: "q8" | string;
  maxWorkers?: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  generation?: GenerationOptions;
  JSZip?: unknown;
  onEvent?: (event: TranslatorEvent) => void;
}

export interface TranslationOptions {
  direction?: Direction;
  model?: string;
  dtype?: string;
  generation?: GenerationOptions;
  glossary?: GlossaryEntry[];
  maxWorkers?: number;
  JSZip?: unknown;
}

export interface TranslationSegment {
  index: number;
  text: string;
  shouldTranslate?: boolean;
  glossary?: {
    text: string;
    replacements: Array<{ id: string; source: string; target: string }>;
  };
}

export interface TranslationResult {
  text?: string;
  segments: string[];
  direction: Direction;
  completed?: number;
  total?: number;
}

export interface DocumentTranslationResult {
  blob: Blob;
  filename: string;
  direction: Direction;
  segments: string[];
}

export type TranslatorEvent =
  | ({ type: "model-progress"; model: string; progress: unknown })
  | ({ type: "translation-progress"; direction: Direction; completed: number; total: number; percent: number; workers: number })
  | ({ type: "document-progress"; phase: "prepare" | "reconstruct"; file: File });

export interface TranslatorClient {
  loadModel(options?: TranslationOptions): Promise<{ model: string; direction: Direction; dtype: string }>;
  translateText(text: string, options?: TranslationOptions): Promise<TranslationResult & { text: string }>;
  translateSegments(segments: TranslationSegment[], options?: TranslationOptions): Promise<TranslationResult>;
  translateDocument(file: File, options?: TranslationOptions): Promise<DocumentTranslationResult>;
  cancel(): void;
  dispose(): void;
  on(event: "model-progress", handler: (event: Extract<TranslatorEvent, { type: "model-progress" }>) => void): () => void;
  on(event: "translation-progress", handler: (event: Extract<TranslatorEvent, { type: "translation-progress" }>) => void): () => void;
  on(event: "document-progress", handler: (event: Extract<TranslatorEvent, { type: "document-progress" }>) => void): () => void;
  off(event: string, handler: (event: any) => void): void;
}

export function createTranslator(options?: TranslatorOptions): TranslatorClient;
export function prepareDocument(file: File, options?: { JSZip?: unknown }): Promise<unknown>;
export function reconstructDocument(context: unknown, translatedSegments: string[]): Promise<{ blob: Blob; filename: string }>;
export function isSupportedDocumentFile(file: File): boolean;
export function createGlossaryEntry(values?: Partial<GlossaryEntry>): GlossaryEntry & { id: string; enabled: boolean };
export function activeEntriesForDirection(entries: GlossaryEntry[], direction: Direction): Array<{ source: string; target: string }>;
export function maskTextWithGlossary(text: string, entries: Array<{ source: string; target: string }>): { text: string; replacements: Array<{ id: string; source: string; target: string }> } | null;
export function applyGlossaryToSegments(segments: TranslationSegment[], glossaryEntries: GlossaryEntry[], direction: Direction): TranslationSegment[];
export function parseGlossaryCsv(text: string): Array<GlossaryEntry & { id: string; enabled: boolean }>;
export function exportGlossaryCsv(entries: GlossaryEntry[]): string;
export function recommendWorkerCount(options?: { segmentCount?: number; maxWorkers?: number; hardwareConcurrency?: number; deviceMemory?: number }): number;
export function splitQueueIntoBatches<T extends { text?: string; glossary?: { text?: string } }>(items: T[], workerCount: number): Array<{ id: string; items: T[]; weight: number }>;
export function modelForDirection(direction?: Direction): string;
export function normalizeDirection(direction?: string): Direction;
export function splitTextToSegments(text: string): TranslationSegment[];
`);

console.log(`Wrote ${dist}`);
