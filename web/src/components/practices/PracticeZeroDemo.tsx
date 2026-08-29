import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Play, RotateCcw, Terminal } from "lucide-react";

type PyodideRuntime = {
  globals: { set: (name: string, value: unknown) => void };
  runPython: (code: string) => unknown;
};

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideRuntime>;
  }
}

const PYODIDE_VERSION = "v314.0.6";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

export default function PracticeZeroDemo() {
  const runtimeRef = useRef<PyodideRuntime | null>(null);
  const initializingRef = useRef(false);
  const [text, setText] = useState("CRIPTOGRAFIA");
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "running" | "error">("loading");

  const initializePython = useCallback(async () => {
    if (runtimeRef.current || initializingRef.current || !window.loadPyodide) return;
    initializingRef.current = true;
    try {
      runtimeRef.current = await window.loadPyodide({ indexURL: PYODIDE_BASE });
      setStatus("ready");
    } catch {
      setStatus("error");
    } finally {
      initializingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-pyodide-loader]");
    const onLoad = () => void initializePython();

    if (window.loadPyodide) {
      queueMicrotask(onLoad);
      return;
    }

    if (existing) {
      existing.addEventListener("load", onLoad);
      return () => existing.removeEventListener("load", onLoad);
    }

    const script = document.createElement("script");
    script.src = `${PYODIDE_BASE}pyodide.js`;
    script.async = true;
    script.dataset.pyodideLoader = "true";
    script.addEventListener("load", onLoad);
    script.addEventListener("error", () => setStatus("error"));
    document.head.appendChild(script);

    return () => script.removeEventListener("load", onLoad);
  }, [initializePython]);

  function execute() {
    const runtime = runtimeRef.current;
    if (!runtime || !text.trim()) return;
    setStatus("running");
    try {
      runtime.globals.set("texto", text);
      setResult(String(runtime.runPython("texto[::-1]")));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  function reset() {
    setText("CRIPTOGRAFIA");
    setResult(null);
  }

  const statusLabel = status === "ready" ? "Python listo" : status === "running" ? "Ejecutando" : status === "error" ? "Error de carga" : "Cargando Python";

  return (
    <div className="grid overflow-hidden rounded-[1.75rem] border border-orange-100/10 bg-[#100d0a] lg:grid-cols-[0.8fr_1.2fr]">
      <section className="border-b border-orange-100/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-700">Entrada</p><h2 className="mt-2 text-xl font-semibold">Transformar texto</h2></div>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider ${status === "ready" ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : status === "error" ? "border-red-300/25 bg-red-300/10 text-red-200" : "border-orange-300/20 bg-orange-300/5 text-orange-200"}`}>
            {status === "loading" || status === "running" ? <LoaderCircle className="size-3 animate-spin" /> : <span className="size-1.5 rounded-full bg-current" />}{statusLabel}
          </div>
        </div>

        <label className="mt-8 block space-y-2 font-mono text-xs text-stone-500">Texto de prueba<input type="text" value={text} onChange={(event) => setText(event.target.value)} maxLength={80} className="h-12 w-full rounded-xl border border-orange-100/10 bg-[#0a0908] px-3 font-mono text-base uppercase text-stone-100 outline-none transition focus:border-orange-400" /></label>
        <p className="mt-3 text-xs leading-5 text-stone-700">La demostración invierte la cadena para comprobar el flujo con Python.</p>
        <div className="mt-7 flex flex-wrap gap-3"><button onClick={execute} disabled={status !== "ready" || !text.trim()} className="inline-flex h-11 items-center gap-2 rounded-full bg-orange-400 px-5 text-sm font-semibold text-[#160d07] transition hover:bg-orange-300 disabled:opacity-40"><Play className="size-4 fill-current" /> Ejecutar Python</button><button onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-full border border-orange-100/10 px-5 text-sm text-stone-300 transition hover:bg-orange-300/5 hover:text-white"><RotateCcw className="size-4" /> Restablecer</button></div>
      </section>

      <section className="terminal-grid relative grid min-h-[390px] place-items-center overflow-hidden p-8">
        <div className="absolute left-6 top-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-700"><Terminal className="size-4 text-orange-400" /> Salida de Python</div>
        <div className="max-w-full text-center" aria-live="polite"><p className="font-mono text-xs uppercase tracking-[0.2em] text-stone-700">Resultado</p><div className="mt-6 min-h-[76px] max-w-[720px] break-all font-mono text-[clamp(2rem,7vw,5.5rem)] font-light leading-none tracking-[-0.055em] text-orange-300 drop-shadow-[0_0_30px_rgb(251_146_60/16%)]">{result ?? "—"}</div><p className="mt-7 font-mono text-xs text-stone-700">{result === null ? "Python espera una instrucción" : `texto[::-1] → ${result}`}</p></div>
      </section>
    </div>
  );
}
