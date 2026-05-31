# React Example

Create one translator client and dispose it when the component unmounts:

```jsx
import { useEffect, useMemo, useState } from "react";
import { createTranslator } from "nmt-enfr";

export function TranslatorPanel() {
  const translator = useMemo(() => createTranslator({ maxWorkers: 2 }), []);
  const [output, setOutput] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const off = translator.on("translation-progress", (event) => setProgress(event.percent));
    return () => {
      off();
      translator.dispose();
    };
  }, [translator]);

  async function translate(source) {
    const result = await translator.translateText(source, { direction: "en-fr" });
    setOutput(result.text);
  }

  return null;
}
```
