export type PyodideRuntime = {
  globals: {
    set: (name: string, value: unknown) => void;
  };
  runPython: (code: string) => unknown;
};

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideRuntime>;
  }
}

const PYODIDE_VERSION = "v314.0.6";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;
const LOADER_SELECTOR = "script[data-pyodide-loader]";

let runtimePromise: Promise<PyodideRuntime> | null = null;

function loadPyodideScript(): Promise<void> {
  if (window.loadPyodide) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(LOADER_SELECTOR);
    const script = existing ?? document.createElement("script");

    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("No fue posible descargar Pyodide."));
    };
    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);

    if (!existing) {
      script.src = `${PYODIDE_BASE}pyodide.js`;
      script.async = true;
      script.dataset.pyodideLoader = "true";
      document.head.appendChild(script);
    }
  });
}

export function loadPythonRuntime(): Promise<PyodideRuntime> {
  if (runtimePromise) return runtimePromise;

  runtimePromise = loadPyodideScript()
    .then(() => {
      if (!window.loadPyodide) {
        throw new Error("Pyodide terminó de cargar sin exponer su inicializador.");
      }
      return window.loadPyodide({ indexURL: PYODIDE_BASE });
    })
    .catch((error) => {
      runtimePromise = null;
      throw error;
    });

  return runtimePromise;
}
