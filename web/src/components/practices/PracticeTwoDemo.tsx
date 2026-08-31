import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, LoaderCircle, Play, RotateCcw, Upload } from "lucide-react";

type PyodideRuntime = {
  globals: { set: (name: string, value: unknown) => void };
  runPython: (code: string) => unknown;
};

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideRuntime>;
  }
}

type CipherResult = {
  salida: string;
  desplazamiento_efectivo: number;
  letras_transformadas: number;
  caracteres_totales: number;
};

const PYODIDE_VERSION = "v314.0.6";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;
const PYTHON_SOURCE = String.raw`
import json

def desplazar_caracter(caracter, desplazamiento):
    if "A" <= caracter <= "Z":
        return chr((ord(caracter) - ord("A") + desplazamiento) % 26 + ord("A"))
    if "a" <= caracter <= "z":
        return chr((ord(caracter) - ord("a") + desplazamiento) % 26 + ord("a"))
    return caracter

salida = "".join(desplazar_caracter(caracter, desplazamiento) for caracter in texto_entrada)
json.dumps({
    "salida": salida,
    "desplazamiento_efectivo": desplazamiento % 26,
    "letras_transformadas": sum(caracter.isascii() and caracter.isalpha() for caracter in texto_entrada),
    "caracteres_totales": len(texto_entrada),
}, ensure_ascii=False)
`;

function readTextFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No fue posible leer el archivo TXT."));
    reader.readAsText(file, "UTF-8");
  });
}

export default function PracticeTwoDemo() {
  const runtimeRef = useRef<PyodideRuntime | null>(null);
  const initializingRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "running" | "error">("loading");
  const [sourceName, setSourceName] = useState("Sin archivo seleccionado");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [shift, setShift] = useState(3);
  const [metrics, setMetrics] = useState<CipherResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initializePython = useCallback(async () => {
    if (runtimeRef.current || initializingRef.current || !window.loadPyodide) return;
    initializingRef.current = true;
    try {
      runtimeRef.current = await window.loadPyodide({ indexURL: PYODIDE_BASE });
      setStatus("ready");
    } catch {
      setStatus("error");
      setError("No fue posible cargar Python. Revisa tu conexión e intenta nuevamente.");
    } finally {
      initializingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-pyodide-loader]");
    const onLoad = () => void initializePython();
    if (window.loadPyodide) { queueMicrotask(onLoad); return; }
    if (existing) { existing.addEventListener("load", onLoad); return () => existing.removeEventListener("load", onLoad); }
    const script = document.createElement("script");
    script.src = `${PYODIDE_BASE}pyodide.js`;
    script.async = true;
    script.dataset.pyodideLoader = "true";
    script.addEventListener("load", onLoad);
    script.addEventListener("error", () => setStatus("error"));
    document.head.appendChild(script);
    return () => script.removeEventListener("load", onLoad);
  }, [initializePython]);

  async function selectFile(file: File | undefined) {
    if (!file) return;
    if (!(file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt"))) { setError("Selecciona un archivo con extensión .txt."); return; }
    if (file.size > 1024 * 1024) { setError("El archivo TXT debe pesar 1 MB o menos."); return; }
    setError(null);
    try {
      setInputText(await readTextFile(file));
      setSourceName(file.name);
      setOutputText("");
      setMetrics(null);
    } catch (fileError) { setError(fileError instanceof Error ? fileError.message : "No fue posible leer el archivo."); }
  }

  function processText() {
    const runtime = runtimeRef.current;
    if (!runtime) { setError("Python todavía se está cargando."); return; }
    if (!inputText) { setError("Carga un TXT o escribe el texto de entrada."); return; }
    setError(null); setStatus("running");
    try {
      runtime.globals.set("texto_entrada", inputText);
      runtime.globals.set("desplazamiento", shift);
      const parsed = JSON.parse(String(runtime.runPython(PYTHON_SOURCE))) as CipherResult;
      setOutputText(parsed.salida);
      setMetrics(parsed);
      setStatus("ready");
    } catch { setStatus("error"); setError("No fue posible procesar el texto."); }
  }

  function downloadOutput() {
    if (!outputText) return;
    const stem = sourceName === "Sin archivo seleccionado" ? "texto" : sourceName.replace(/\.txt$/i, "");
    const url = URL.createObjectURL(new Blob([outputText], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${stem}_desplazado_${shift}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setSourceName("Sin archivo seleccionado"); setInputText(""); setOutputText("");
    setShift(3); setMetrics(null); setError(null);
  }

  const busy = status === "loading" || status === "running";
  const statusLabel = status === "ready" ? "Python listo" : status === "running" ? "Desplazando texto" : status === "error" ? "Error" : "Cargando Python";
  const inputClass = "w-full rounded-xl border border-orange-100/10 bg-[#0a0908] px-4 py-3 font-mono text-sm leading-6 text-stone-200 outline-none transition focus:border-orange-400";
  const buttonClass = "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-orange-400 px-5 text-sm font-semibold text-[#160d07] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <>
      <div className="overflow-hidden rounded-[1.75rem] border border-orange-100/10 bg-[#100d0a]">
        <div className="flex flex-col gap-4 border-b border-orange-100/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-700">Laboratorio de texto</p><h2 className="mt-1 text-xl font-semibold">Carga un TXT y elige el desplazamiento</h2></div>
          <div className={`flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider ${status === "ready" ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : status === "error" ? "border-red-300/25 bg-red-300/10 text-red-200" : "border-orange-300/20 bg-orange-300/5 text-orange-200"}`}>{busy ? <LoaderCircle className="size-3 animate-spin" /> : <span className="size-1.5 rounded-full bg-current" />}{statusLabel}</div>
        </div>

        <div className="grid gap-px bg-orange-100/10 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="bg-[#100d0a] p-6 sm:p-8">
            <label className="grid min-h-44 cursor-pointer place-items-center rounded-2xl border border-dashed border-orange-300/25 bg-[#0a0908] p-7 text-center transition hover:border-orange-300/60"><input type="file" accept=".txt,text/plain" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0])} /><span><Upload className="mx-auto size-8 text-orange-400" /><span className="mt-4 block font-medium text-stone-200">{sourceName}</span><span className="mt-2 block text-xs text-stone-600">Archivo TXT en UTF-8 · máximo 1 MB</span></span></label>
            <div className="mt-6 rounded-xl border border-orange-100/10 bg-[#0a0908] p-5">
              <div className="flex items-center justify-between"><span className="font-mono text-xs text-stone-500">Desplazamiento n</span><input type="number" min={-25} max={25} value={shift} onChange={(event) => setShift(Math.min(25, Math.max(-25, Number.parseInt(event.target.value || "0", 10))))} className="h-9 w-20 rounded-lg border border-orange-100/10 bg-[#100d0a] text-center font-mono text-orange-300 outline-none focus:border-orange-400" /></div>
              <input type="range" min={-25} max={25} step={1} value={shift} onChange={(event) => setShift(Number.parseInt(event.target.value, 10))} className="mt-7 w-full accent-orange-400" />
              <div className="mt-3 flex justify-between font-mono text-[9px] text-stone-700"><span>-25</span><span>0</span><span>+25</span></div>
            </div>
            <p className="mt-4 text-xs leading-5 text-stone-600">Los valores positivos cifran hacia adelante; los negativos invierten el desplazamiento.</p>
            <button onClick={processText} disabled={busy || !inputText} className={`${buttonClass} mt-6`}><Play className="size-4 fill-current" /> Desplazar letras</button>
          </section>

          <section className="bg-[#0e0c09] p-6 sm:p-8"><label className="font-mono text-xs uppercase tracking-[0.14em] text-stone-600">Texto de entrada<textarea value={inputText} onChange={(event) => { setInputText(event.target.value); setOutputText(""); setMetrics(null); }} placeholder="Carga un archivo o escribe aquí..." className={`${inputClass} mt-3 min-h-80 resize-y`} /></label></section>
        </div>
        {error ? <div className="border-t border-red-300/15 bg-red-300/5 px-6 py-4"><p role="alert" className="text-sm text-red-300">{error}</p></div> : null}
      </div>

      <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-orange-100/10 bg-[#100d0a]">
        <div className="flex flex-col gap-3 border-b border-orange-100/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><FileText className="size-4 text-orange-400" /><div><p className="font-mono text-[9px] uppercase tracking-[0.2em] text-stone-700">Salida</p><h3 className="mt-1 font-semibold text-stone-200">Texto desplazado</h3></div></div>{metrics ? <div className="flex flex-wrap gap-2 font-mono text-[10px] text-stone-500"><span>{metrics.letras_transformadas} letras</span><span>·</span><span>{metrics.caracteres_totales} caracteres</span><span>·</span><span>n efectivo: {metrics.desplazamiento_efectivo}</span></div> : null}</div>
        <div className="p-5 sm:p-7"><textarea value={outputText} readOnly placeholder="El resultado aparecerá aquí." className={`${inputClass} min-h-72 resize-y text-orange-100`} aria-label="Texto de salida" /></div>
        <div className="flex flex-col gap-3 border-t border-orange-100/10 p-4 sm:flex-row sm:justify-between"><button onClick={reset} className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-orange-200"><RotateCcw className="size-4" /> Restablecer</button><button onClick={downloadOutput} disabled={!outputText} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-orange-100/10 px-5 text-sm text-stone-300 transition hover:bg-orange-300/5 disabled:opacity-40"><Download className="size-4" /> Descargar resultado.txt</button></div>
      </section>
    </>
  );
}
