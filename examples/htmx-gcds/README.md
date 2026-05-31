# HTMX/GCDS Example

This package is headless, so HTMX and GCDS integration is ordinary page code:

```js
import { createTranslator } from "https://cdn.jsdelivr.net/npm/nmt-enfr/dist/index.js";

window.nmt = createTranslator({ maxWorkers: 2 });

document.querySelector("#translate").addEventListener("click", async () => {
  const result = await window.nmt.translateText(source.value, {
    direction: direction.value,
    glossary: currentGlossaryEntries,
  });
  output.textContent = result.text;
});
```

Use GCDS for controls and status display, and use the client's progress events to update those components.
