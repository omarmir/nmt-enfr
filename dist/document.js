import { splitTextToSegments } from "./text.js";

export function isSupportedDocumentFile(file) {
  return /\.(docx|pptx)$/i.test(file?.name || "");
}

export async function prepareDocument(file, { JSZip = globalThis.JSZip } = {}) {
  if (!file) throw new Error("A DOCX or PPTX file is required.");
  if (!isSupportedDocumentFile(file)) throw new Error("Only DOCX and PPTX files are supported.");
  if (!JSZip?.loadAsync) throw new Error("JSZip is required for document translation.");

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const docs = {};
  const xmlPaths = [/word\/document\.xml$/, /ppt\/slides\/slide\d+\.xml$/, /ppt\/notesSlides\/notesSlide\d+\.xml$/];
  const tasks = [];

  zip.forEach((path, entry) => {
    if (xmlPaths.some((pattern) => pattern.test(path))) {
      tasks.push(entry.async("string").then((content) => {
        docs[path] = new DOMParser().parseFromString(content, "application/xml");
      }));
    }
  });
  await Promise.all(tasks);

  const queue = [];
  const nodeMaps = [];
  let index = 0;
  for (const [path, doc] of Object.entries(docs)) {
    const nodes = [
      ...Array.from(doc.getElementsByTagName("w:t")),
      ...Array.from(doc.getElementsByTagName("a:t")),
      ...Array.from(doc.getElementsByTagName("t")),
    ];
    for (const node of nodes) {
      const raw = node.textContent || "";
      if (!raw.trim()) continue;
      const entries = splitTextToSegments(raw).map((entry) => ({
        ...entry,
        index: index++,
      }));
      const indices = [];
      for (const entry of entries) {
        queue.push(entry);
        indices.push(entry.index);
      }
      nodeMaps.push({ path, node, indices });
    }
  }

  return { file, zip, docs, nodeMaps, queue };
}

export async function reconstructDocument(context, translatedSegments) {
  const translated = Array.isArray(translatedSegments) ? translatedSegments : [];
  for (const { node, indices } of context.nodeMaps || []) {
    node.textContent = indices.map((index) => translated[index] || "").join("");
  }
  for (const [path, doc] of Object.entries(context.docs || {})) {
    context.zip.file(path, new XMLSerializer().serializeToString(doc));
  }
  const blob = await context.zip.generateAsync({ type: "blob", mimeType: context.file.type });
  return {
    blob,
    filename: context.file.name.replace(/(\.docx|\.pptx)$/i, "_translated$1"),
  };
}
