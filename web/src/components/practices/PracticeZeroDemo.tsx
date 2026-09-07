import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Terminal } from "lucide-react";
import RuntimeStatus, { type RuntimeState } from "../ui/RuntimeStatus";
import {
  loadPythonRuntime,
  type PyodideRuntime,
} from "../../lib/pyodide";
import pythonSource from "../../python/practica_00.py?raw";

export default function PracticeZeroDemo() {
  const runtimeRef = useRef<PyodideRuntime | null>(null);
  const [text, setText] = useState("CRIPTOGRAFIA");
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<RuntimeState>("loading");

  useEffect(() => {
    let cancelled = false;

    void loadPythonRuntime()
      .then((runtime) => {
        if (cancelled) return;
        runtime.runPython(pythonSource);
        runtimeRef.current = runtime;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function execute() {
    const runtime = runtimeRef.current;
    if (!runtime || !text.trim()) return;
    setStatus("running");
    try {
      runtime.globals.set("texto", text);
      setResult(String(runtime.runPython("transformar(texto)")));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  function reset() {
    setText("CRIPTOGRAFIA");
    setResult(null);
  }

  return (
    <div className="grid overflow-hidden rounded-[1.75rem] border border-orange-100/10 bg-[#100d0a] lg:grid-cols-[0.8fr_1.2fr]">
      <section className="border-b border-orange-100/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-700">Entrada</p><h2 className="mt-2 text-xl font-semibold">Transformar texto</h2></div>
          <RuntimeStatus status={status} runningLabel="Ejecutando" />
        </div>

        <label className="mt-8 block space-y-2 font-mono text-xs text-stone-500">Texto de prueba<input type="text" value={text} onChange={(event) => setText(event.target.value)} maxLength={80} className="h-12 w-full rounded-xl border border-orange-100/10 bg-[#0a0908] px-3 font-mono text-base uppercase text-stone-100 outline-none transition focus:border-orange-400" /></label>
        <p className="mt-3 text-xs leading-5 text-stone-700">La demostración invierte la cadena para comprobar el flujo con Python.</p>
        <div className="mt-7 flex flex-wrap gap-3"><button onClick={execute} disabled={status !== "ready" || !text.trim()} className="inline-flex h-11 items-center gap-2 rounded-full bg-orange-400 px-5 text-sm font-semibold text-[#160d07] transition hover:bg-orange-300 disabled:opacity-40"><Play className="size-4 fill-current" /> Ejecutar Python</button><button onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-full border border-orange-100/10 px-5 text-sm text-stone-300 transition hover:bg-orange-300/5 hover:text-white"><RotateCcw className="size-4" /> Restablecer</button></div>
      </section>

      <section className="terminal-grid relative grid min-h-[390px] place-items-center overflow-hidden p-8">
        <div className="absolute left-6 top-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-700"><Terminal className="size-4 text-orange-400" /> Salida de Python</div>
        <div className="max-w-full text-center" aria-live="polite"><p className="font-mono text-xs uppercase tracking-[0.2em] text-stone-700">Resultado</p><div className="mt-6 min-h-[76px] max-w-[720px] break-all font-mono text-[clamp(2rem,7vw,5.5rem)] font-light leading-none tracking-[-0.055em] text-orange-300 drop-shadow-[0_0_30px_rgb(251_146_60/16%)]">{result ?? "—"}</div><p className="mt-7 font-mono text-xs text-stone-700">{result === null ? "Python espera una instrucción" : `transformar(texto) → ${result}`}</p></div>
      </section>
    </div>
  );
}
