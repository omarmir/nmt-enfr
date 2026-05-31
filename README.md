# nmt-enfr

Framework-neutral browser EN-FR and FR-EN neural machine translation for Transformers.js.

`nmt-enfr` is a headless runtime. It gives a site the translation client, worker orchestration, glossary helpers, and DOCX/PPTX helpers, but leaves the interface to the host app. Use it from static HTML, HTMX/GCDS, React/Shadcn, or any other frontend.

## Install

```bash
npm install nmt-enfr
```

Or import the ESM build from jsDelivr's GitHub CDN:

```html
<script type="module">
  import { createTranslator } from "https://cdn.jsdelivr.net/gh/omarmir/nmt-enfr@latest/dist/index.js";
</script>
```

For a single minified browser script, use the global GitHub CDN bundle:

```html
<script src="https://cdn.jsdelivr.net/gh/omarmir/nmt-enfr@latest/dist/nmt-enfr.min.js"></script>
<script>
  const { createTranslator } = NmtEnfr;
</script>
```

Pin a release tag instead of `main` when a release includes the bundle.

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
Transformers.js browser caching is enabled by default so model assets can be reused by the browser after the first download.
Pass `useBrowserCache: false` to opt out.

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
