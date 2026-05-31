export function createGlossaryEntry(values = {}) {
  return {
    id: values.id || makeId(),
    english: String(values.english || "").trim(),
    french: String(values.french || "").trim(),
    enabled: values.enabled !== false,
  };
}

export function activeEntriesForDirection(entries, direction) {
  const sourceKey = direction === "fr-en" ? "french" : "english";
  const targetKey = direction === "fr-en" ? "english" : "french";
  const bySource = new Map();
  for (const entry of entries || []) {
    if (!entry.enabled) continue;
    const source = String(entry[sourceKey] || "").trim();
    const target = String(entry[targetKey] || "").trim();
    if (!source || !target) continue;
    bySource.set(source.toLocaleLowerCase(), { source, target });
  }
  return Array.from(bySource.values()).sort((a, b) => b.source.length - a.source.length);
}

export function maskTextWithGlossary(text, entries) {
  const sourceText = String(text || "");
  if (!sourceText || !entries?.length) return null;

  const matches = [];
  for (const entry of entries) {
    for (const match of findWholeTermMatches(sourceText, entry.source)) {
      if (matches.some((existing) => rangesOverlap(existing, match))) continue;
      matches.push({ ...match, source: sourceText.slice(match.start, match.end), target: entry.target });
    }
  }

  if (!matches.length) return null;
  matches.sort((a, b) => a.start - b.start);

  let masked = sourceText;
  const replacements = matches.map((match, index) => ({
    id: String(index),
    source: match.source,
    target: match.target,
  }));

  for (let index = matches.length - 1; index >= 0; index--) {
    const match = matches[index];
    masked = `${masked.slice(0, match.start)}${glossaryToken(index)}${masked.slice(match.end)}`;
  }

  return { text: masked, replacements };
}

export function applyGlossaryToSegments(segments, glossaryEntries, direction) {
  const active = activeEntriesForDirection(glossaryEntries || [], direction);
  if (!active.length) return segments.map((item) => ({ ...item }));
  return segments.map((item) => {
    if (!item.shouldTranslate) return { ...item };
    const masked = maskTextWithGlossary(item.text, active);
    return masked ? { ...item, glossary: masked } : { ...item };
  });
}

export function parseGlossaryCsv(text) {
  const rows = parseDelimitedRows(String(text || ""));
  const nonEmpty = rows.filter((row) => row.some((cell) => cell.trim()));
  if (!nonEmpty.length) return [];

  const delimiterRows = nonEmpty.map((row) => row.map((cell) => cell.trim()));
  const header = delimiterRows[0].map((cell) => normalizeHeader(cell));
  let englishIndex = findHeaderIndex(header, ["english", "en", "source", "source_en"]);
  let frenchIndex = findHeaderIndex(header, ["french", "fr", "target", "target_fr"]);
  let start = 1;

  if (englishIndex === -1 || frenchIndex === -1) {
    if (delimiterRows[0].length === 2) {
      englishIndex = 0;
      frenchIndex = 1;
      start = 0;
    } else {
      return [];
    }
  }

  const entries = [];
  for (const row of delimiterRows.slice(start)) {
    const english = (row[englishIndex] || "").trim();
    const french = (row[frenchIndex] || "").trim();
    if (!english && !french) continue;
    entries.push(createGlossaryEntry({ english, french, enabled: true }));
  }
  return entries;
}

export function exportGlossaryCsv(entries) {
  const rows = [["english", "french"]];
  for (const entry of entries || []) {
    if (!entry.english && !entry.french) continue;
    rows.push([entry.english || "", entry.french || ""]);
  }
  return rows.map((row) => row.map(formatCsvCell).join(",")).join("\n") + "\n";
}

function parseDelimitedRows(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function detectDelimiter(text) {
  const firstLine = String(text || "").split(/\r?\n/, 1)[0] || "";
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = countUnquoted(firstLine, candidate);
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

function countUnquoted(text, delimiter) {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"' && text[index + 1] === '"') {
      index++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === delimiter) {
      count++;
    }
  }
  return count;
}

function findWholeTermMatches(text, term) {
  const matches = [];
  const needle = String(term || "").trim();
  if (!needle) return matches;
  const regex = new RegExp(escapeRegExp(needle), "giu");
  let match;
  while ((match = regex.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    if (isWholeTermBoundary(text, start, end)) matches.push({ start, end });
    if (regex.lastIndex === start) regex.lastIndex++;
  }
  return matches;
}

function isWholeTermBoundary(text, start, end) {
  const before = start > 0 ? text[start - 1] : "";
  const after = end < text.length ? text[end] : "";
  return !isWordChar(before) && !isWordChar(after);
}

function isWordChar(char) {
  return /[\p{L}\p{N}_]/u.test(char);
}

function rangesOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLocaleLowerCase().replace(/[\s-]+/g, "_");
}

function findHeaderIndex(header, names) {
  return header.findIndex((cell) => names.includes(cell));
}

function formatCsvCell(value) {
  const text = String(value || "");
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function glossaryToken(id) {
  return `ZXGLOSS${id}ZX`;
}

function makeId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
