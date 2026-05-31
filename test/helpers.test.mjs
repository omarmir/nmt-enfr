import test from "node:test";
import assert from "node:assert/strict";

import {
  activeEntriesForDirection,
  exportGlossaryCsv,
  maskTextWithGlossary,
  parseGlossaryCsv,
  recommendWorkerCount,
  splitQueueIntoBatches,
  splitTextToSegments,
} from "../src/index.js";

test("segments text while preserving line breaks", () => {
  const segments = splitTextToSegments("Hello world.\nBonjour.");
  assert.deepEqual(segments.map((item) => item.text), ["Hello world.", "\n", "Bonjour."]);
  assert.deepEqual(segments.map((item) => item.shouldTranslate), [true, false, true]);
});

test("parses and exports glossary CSV", () => {
  const entries = parseGlossaryCsv('english,french\n"login, button","bouton de connexion"\n');
  assert.equal(entries[0].english, "login, button");
  assert.equal(entries[0].french, "bouton de connexion");
  assert.match(exportGlossaryCsv(entries), /"login, button",bouton de connexion/);
});

test("selects direction-specific glossary terms and masks whole terms", () => {
  const entries = [
    { english: "login", french: "connexion", enabled: true },
    { english: "login button", french: "bouton de connexion", enabled: true },
  ];
  const active = activeEntriesForDirection(entries, "en-fr");
  const masked = maskTextWithGlossary("Click the login button, not logins.", active);
  assert.equal(masked.text, "Click the ZXGLOSS0ZX, not logins.");
  assert.deepEqual(masked.replacements, [{ id: "0", source: "login button", target: "bouton de connexion" }]);
});

test("plans worker count and balances batches", () => {
  assert.equal(recommendWorkerCount({
    segmentCount: 120,
    maxWorkers: 8,
    hardwareConcurrency: 16,
    deviceMemory: 32,
  }), 8);

  const batches = splitQueueIntoBatches([
    { index: 0, text: "aaaaaaaaaa" },
    { index: 1, text: "bb" },
    { index: 2, text: "cc" },
    { index: 3, text: "dd" },
  ], 2);

  assert.deepEqual(batches.map((batch) => batch.items.map((item) => item.index)), [[0], [1, 2, 3]]);
});
