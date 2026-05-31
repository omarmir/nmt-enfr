export function modelForDirection(direction = "en-fr") {
  return direction === "fr-en" ? "opus-mt-fr-en" : "opus-mt-en-fr";
}

export function normalizeDirection(direction = "en-fr") {
  return direction === "fr-en" ? "fr-en" : "en-fr";
}

export function splitTextToSegments(text) {
  const entries = [];
  let index = 0;
  const blocks = String(text || "").split(/((?:\r\n|\r|\n)+)/);
  for (const block of blocks) {
    if (!block) continue;
    if (/^(?:\r\n|\r|\n)+$/.test(block)) {
      entries.push({ index: index++, text: block, shouldTranslate: false });
      continue;
    }
    const matches = block.match(/\s*[^.!?]+[.!?]+["')\]]*|\s*[^.!?]+$/g) || [block];
    for (const sentence of matches) {
      entries.push({
        index: index++,
        text: sentence,
        shouldTranslate: sentence.trim().length > 0,
      });
    }
  }
  return entries;
}
