# nmt-enfr

Framework-neutral browser EN-FR and FR-EN neural machine translation for Transformers.js.

`nmt-enfr` is a headless runtime. It gives a site the translation client, worker orchestration, glossary helpers, and DOCX/PPTX helpers, but leaves the interface to the host app. Use it from static HTML, HTMX/GCDS, React/Shadcn, or any other frontend.

## Install

```bash
npm install nmt-enfr
```

Or import the ESM build from a CDN:

```html
<script type="module">
  import { createTranslator } from "https://cdn.jsdelivr.net/npm/nmt-enfr/dist/index.js";
</script>
```

For a single minified browser script, use the global CDN bundle:

```html
<script src="https://cdn.jsdelivr.net/npm/nmt-enfr/dist/nmt-enfr.min.js"></script>
<script>
  const { createTranslator } = NmtEnfr;
</script>
```

jsDelivr can also serve the open source GitHub project directly. Pin a release tag when possible:

```html
<script src="https://cdn.jsdelivr.net/gh/omarmir/nmt-enfr@main/dist/nmt-enfr.min.js"></script>
```

The GitHub CDN base was verified with `https://cdn.jsdelivr.net/gh/omarmir/nmt-enfr@main/package.json`. The minified bundle URL will return 200 after `dist/nmt-enfr.min.js` is committed to `main` or a tagged release.

## Basic Usage

```js
import { createTranslator } from "nmt-enfr";

const translator = createTranslator({
  transformersUrl: "https://cdn.jsdelivr.net/npm/@huggingface/transformers/dist/transformers.min.js",
  maxWorkers: 2,
});

translator.on("translation-progress", (event) => {
  console.log(`${Math.round(event.percent)}%`);
});

const result = await translator.translateText("Click the login button to begin.", {
  direction: "en-fr",
  glossary: [
    { english: "login button", french: "bouton de connexion", enabled: true },
  ],
});

console.log(result.text);
translator.dispose();
```

## Asset Loading

By default, the package loads remote public `Xenova/opus-mt-en-fr` and `Xenova/opus-mt-fr-en` model assets through Transformers.js.

For a self-hosted deployment, pass asset URLs:

```js
const translator = createTranslator({
  transformersUrl: "/vendor/transformers.min.js",
  wasmBaseUrl: "/vendor/ort/",
  modelsBaseUrl: "/models/",
  allowRemoteModels: false,
});
```

With `modelsBaseUrl`, the model directories should be:

```text
/models/opus-mt-en-fr/
/models/opus-mt-fr-en/
```

## Public Helpers

```js
import {
  parseGlossaryCsv,
  exportGlossaryCsv,
  splitTextToSegments,
  recommendWorkerCount,
} from "nmt-enfr";
```

These helpers are pure and have no UI or storage dependency.

## Document Translation

DOCX/PPTX translation requires JSZip. Provide it through `createTranslator({ JSZip })` or per call:

```js
const documentResult = await translator.translateDocument(file, {
  direction: "fr-en",
  JSZip: window.JSZip,
});

const url = URL.createObjectURL(documentResult.blob);
```

## Development

```bash
npm install
npm test
npm run build
```

The build script copies `src/` to `dist/` and emits TypeScript declarations for CDN and npm consumers.
