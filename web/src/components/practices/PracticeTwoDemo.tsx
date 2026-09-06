import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  FileKey2,
  FileText,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Music2,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Upload,
  UserRoundCheck,
} from "lucide-react";

type PyodideRuntime = {
  globals: { set: (name: string, value: unknown) => void };
  runPython: (code: string) => unknown;
};

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideRuntime>;
  }
}

type TextFile = { name: string; text: string };
type CipherResult = {
  salida: string;
  desplazamiento_efectivo: number;
  letras_transformadas: number;
  caracteres_totales: number;
  operacion: "cifrar" | "descifrar";
};

const PYODIDE_VERSION = "v314.0.6";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;
const buttonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-orange-400 px-5 text-sm font-semibold text-[#160d07] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-40";
const previewClass =
  "mt-3 min-h-64 w-full resize-y rounded-xl border border-orange-100/10 bg-[#0a0908] px-4 py-3 font-mono text-sm leading-6 text-stone-300 outline-none";

const PYTHON_SOURCE = String.raw`
import json

def desplazar_caracter(caracter, desplazamiento):
    if "A" <= caracter <= "Z":
        origen = ord("A")
        return chr((ord(caracter) - origen + desplazamiento) % 26 + origen)
    if "a" <= caracter <= "z":
        origen = ord("a")
        return chr((ord(caracter) - origen + desplazamiento) % 26 + origen)
    return caracter

direccion = 1 if operacion == "cifrar" else -1
salida = "".join(
    desplazar_caracter(caracter, direccion * desplazamiento)
    for caracter in texto_entrada
)
json.dumps({
    "salida": salida,
    "desplazamiento_efectivo": desplazamiento % 26,
    "letras_transformadas": sum(
        caracter.isascii() and caracter.isalpha()
        for caracter in texto_entrada
    ),
    "caracteres_totales": len(texto_entrada),
    "operacion": operacion,
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

function downloadText(content: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ShiftControl({
  id,
  value,
  onChange,
  operation,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  operation: "cifrar" | "descifrar";
}) {
  return (
    <div className="rounded-2xl border border-orange-100/10 bg-[#0a0908] p-5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="font-mono text-xs text-stone-500">
          Desplazamiento n
        </label>
        <input
          type="number"
          min={0}
          max={25}
          value={value}
          onChange={(event) =>
            onChange(
              Math.min(
                25,
                Math.max(0, Number.parseInt(event.target.value || "0", 10)),
              ),
            )
          }
          className="h-9 w-20 rounded-lg border border-orange-100/10 bg-[#100d0a] text-center font-mono text-orange-300 outline-none focus:border-orange-400"
          aria-label={`Desplazamiento para ${operation}`}
        />
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={25}
        step={1}
        value={value}
        onChange={(event) => onChange(Number.parseInt(event.target.value, 10))}
        className="mt-7 w-full accent-orange-400"
      />
      <div className="mt-3 flex justify-between font-mono text-[9px] text-stone-700">
        <span>0</span>
        <span>13</span>
        <span>25</span>
      </div>
      <p className="mt-4 border-t border-orange-100/10 pt-4 font-mono text-[11px] leading-5 text-stone-600">
        {operation === "cifrar"
          ? `Cifrado: posición nueva = (posición + ${value}) mod 26`
          : `Descifrado: posición original = (posición − ${value}) mod 26`}
      </p>
    </div>
  );
}

function FileDrop({
  actor,
  filename,
  hint,
  onFile,
}: {
  actor: string;
  filename: string | null;
  hint: string;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <label className="grid min-h-44 cursor-pointer place-items-center rounded-2xl border border-dashed border-orange-300/25 bg-[#0a0908] p-7 text-center transition hover:border-orange-300/60">
      <input
        type="file"
        accept=".txt,text/plain"
        className="sr-only"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
      <span>
        <Upload className="mx-auto size-8 text-orange-400" />
        <span className="mt-4 block font-medium text-stone-200">
          {filename ?? actor}
        </span>
        <span className="mt-2 block text-xs leading-5 text-stone-600">{hint}</span>
      </span>
    </label>
  );
}

function TextPreview({
  label,
  text,
  placeholder,
  highlight = false,
}: {
  label: string;
  text: string;
  placeholder: string;
  highlight?: boolean;
}) {
  return (
    <label className="block font-mono text-xs uppercase tracking-[0.14em] text-stone-600">
      {label}
      <textarea
        value={text}
        readOnly
        placeholder={placeholder}
        className={`${previewClass} ${highlight ? "text-orange-100" : ""}`}
      />
    </label>
  );
}

function Metrics({ value }: { value: CipherResult | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap gap-2 font-mono text-[10px] text-stone-500">
      <span>{value.letras_transformadas} letras</span>
      <span>·</span>
      <span>{value.caracteres_totales} caracteres</span>
      <span>·</span>
      <span>n: {value.desplazamiento_efectivo}</span>
    </div>
  );
}

export default function PracticeTwoDemo() {
  const runtimeRef = useRef<PyodideRuntime | null>(null);
  const initializingRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "running" | "error">(
    "loading",
  );
  const [aliciaFile, setAliciaFile] = useState<TextFile | null>(null);
  const [betitoFile, setBetitoFile] = useState<TextFile | null>(null);
  const [encryptShift, setEncryptShift] = useState(3);
  const [decryptShift, setDecryptShift] = useState(3);
  const [encryptedText, setEncryptedText] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [encryptMetrics, setEncryptMetrics] = useState<CipherResult | null>(null);
  const [decryptMetrics, setDecryptMetrics] = useState<CipherResult | null>(null);
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
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-pyodide-loader]",
    );
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
    script.addEventListener("error", () => {
      setStatus("error");
      setError("No fue posible descargar Pyodide.");
    });
    document.head.appendChild(script);
    return () => script.removeEventListener("load", onLoad);
  }, [initializePython]);

  async function selectTextFile(
    file: File | undefined,
    actor: "alicia" | "betito",
  ) {
    if (!file) return;
    if (!(file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt"))) {
      setError("Selecciona un archivo con extensión .txt.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("El archivo TXT debe pesar 1 MB o menos.");
      return;
    }
    setError(null);
    try {
      const selected = { name: file.name, text: await readTextFile(file) };
      if (actor === "alicia") {
        setAliciaFile(selected);
        setEncryptedText("");
        setEncryptMetrics(null);
      } else {
        setBetitoFile(selected);
        setDecryptedText("");
        setDecryptMetrics(null);
      }
    } catch (fileError) {
      setError(
        fileError instanceof Error
          ? fileError.message
          : "No fue posible leer el archivo.",
      );
    }
  }

  function runOperation(operation: "cifrar" | "descifrar") {
    const runtime = runtimeRef.current;
    const source = operation === "cifrar" ? aliciaFile : betitoFile;
    const shift = operation === "cifrar" ? encryptShift : decryptShift;
    if (!runtime) {
      setError("Python todavía se está cargando.");
      return;
    }
    if (!source) {
      setError(
        operation === "cifrar"
          ? "Alicia debe seleccionar primero el TXT de la canción."
          : "Betito debe seleccionar primero el archivo song_c.txt.",
      );
      return;
    }
    setError(null);
    setStatus("running");
    try {
      runtime.globals.set("texto_entrada", source.text);
      runtime.globals.set("desplazamiento", shift);
      runtime.globals.set("operacion", operation);
      const parsed = JSON.parse(
        String(runtime.runPython(PYTHON_SOURCE)),
      ) as CipherResult;
      if (operation === "cifrar") {
        setEncryptedText(parsed.salida);
        setEncryptMetrics(parsed);
      } else {
        setDecryptedText(parsed.salida);
        setDecryptMetrics(parsed);
      }
      setStatus("ready");
    } catch {
      setStatus("error");
      setError(
        operation === "cifrar"
          ? "No fue posible cifrar la canción."
          : "No fue posible descifrar la canción.",
      );
    }
  }

  function resetAlicia() {
    setAliciaFile(null);
    setEncryptShift(3);
    setEncryptedText("");
    setEncryptMetrics(null);
    setError(null);
  }

  function resetBetito() {
    setBetitoFile(null);
    setDecryptShift(3);
    setDecryptedText("");
    setDecryptMetrics(null);
    setError(null);
  }

  const busy = status === "loading" || status === "running";
  const statusLabel =
    status === "ready"
      ? "Python listo"
      : status === "running"
        ? "Procesando texto"
        : status === "error"
          ? "Error"
          : "Cargando Python";

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[1.75rem] border border-orange-100/10 bg-[#100d0a]">
        <div className="flex flex-col gap-4 border-b border-orange-100/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400">
              Parte 1 · Alicia cifra
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              Cargar la canción y generar song_c.txt
            </h2>
          </div>
          <div
            className={`flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider ${
              status === "ready"
                ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                : status === "error"
                  ? "border-red-300/25 bg-red-300/10 text-red-200"
                  : "border-orange-300/20 bg-orange-300/5 text-orange-200"
            }`}
          >
            {busy ? (
              <LoaderCircle className="size-3 animate-spin" />
            ) : (
              <span className="size-1.5 rounded-full bg-current" />
            )}
            {statusLabel}
          </div>
        </div>

        <div className="grid gap-px bg-orange-100/10 lg:grid-cols-[1fr_0.9fr]">
          <div className="bg-[#100d0a] p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-stone-300">
              <Music2 className="size-4 text-orange-400" />
              Archivo de canción de Alicia
            </div>
            <FileDrop
              actor="Seleccionar canción .txt"
              filename={aliciaFile?.name ?? null}
              hint="Solo archivos TXT en UTF-8 · máximo 1 MB"
              onFile={(file) => void selectTextFile(file, "alicia")}
            />
          </div>
          <div className="bg-[#0e0c09] p-6 sm:p-8">
            <ShiftControl
              id="alicia-shift"
              value={encryptShift}
              onChange={(value) => {
                setEncryptShift(value);
                setEncryptedText("");
                setEncryptMetrics(null);
              }}
              operation="cifrar"
            />
            <button
              onClick={() => runOperation("cifrar")}
              disabled={busy || !aliciaFile}
              className={`${buttonClass} mt-6 w-full sm:w-auto`}
            >
              <LockKeyhole className="size-4" /> Cifrar y generar song_c.txt
            </button>
          </div>
        </div>

        <div className="grid gap-px border-t border-orange-100/10 bg-orange-100/10 lg:grid-cols-2">
          <div className="bg-[#100d0a] p-6 sm:p-8">
            <TextPreview
              label="Canción original"
              text={aliciaFile?.text ?? ""}
              placeholder="El contenido del TXT de Alicia aparecerá aquí."
            />
          </div>
          <div className="bg-[#0e0c09] p-6 sm:p-8">
            <div className="mb-3 flex min-h-4 items-center justify-between gap-4">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-stone-600">
                Canción cifrada
              </span>
              <Metrics value={encryptMetrics} />
            </div>
            <textarea
              value={encryptedText}
              readOnly
              placeholder="Aquí aparecerá el contenido de song_c.txt."
              className={`${previewClass} mt-0 text-orange-100`}
              aria-label="Canción cifrada"
            />
            <button
              onClick={() => downloadText(encryptedText, "song_c.txt")}
              disabled={!encryptedText}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-orange-100/10 px-5 text-sm text-stone-300 transition hover:bg-orange-300/5 disabled:opacity-40"
            >
              <Download className="size-4" /> Descargar song_c.txt
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-orange-100/10 px-6 py-4">
          <button
            onClick={resetAlicia}
            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-orange-200"
          >
            <RotateCcw className="size-4" /> Restablecer a Alicia
          </button>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-orange-300/20 bg-orange-300/[0.045] px-6 py-6 sm:px-8">
        <div className="grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
          <span className="grid size-12 place-items-center rounded-full border border-orange-300/25 bg-orange-300/10 text-orange-300">
            <Send className="size-5" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400">
              Intercambio entre personas
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              Alicia entrega <strong className="text-stone-200">song_c.txt</strong> a
              Betito y le comunica verbalmente el número de desplazamiento. La clave no
              viaja dentro del archivo.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-orange-100/10 px-4 py-2 font-mono text-[11px] text-orange-200">
            <KeyRound className="size-4" /> n = {encryptShift}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border border-orange-100/10 bg-[#100d0a]">
        <div className="border-b border-orange-100/10 px-6 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400">
            Parte 2 · Betito descifra
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            Cargar song_c.txt y recuperar song_c_d.txt
          </h2>
        </div>

        <div className="grid gap-px bg-orange-100/10 lg:grid-cols-[1fr_0.9fr]">
          <div className="bg-[#100d0a] p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-stone-300">
              <UserRoundCheck className="size-4 text-orange-400" />
              Archivo recibido por Betito
            </div>
            <FileDrop
              actor="Seleccionar song_c.txt"
              filename={betitoFile?.name ?? null}
              hint="Archivo cifrado recibido de Alicia · máximo 1 MB"
              onFile={(file) => void selectTextFile(file, "betito")}
            />
          </div>
          <div className="bg-[#0e0c09] p-6 sm:p-8">
            <ShiftControl
              id="betito-shift"
              value={decryptShift}
              onChange={(value) => {
                setDecryptShift(value);
                setDecryptedText("");
                setDecryptMetrics(null);
              }}
              operation="descifrar"
            />
            <button
              onClick={() => runOperation("descifrar")}
              disabled={busy || !betitoFile}
              className={`${buttonClass} mt-6 w-full sm:w-auto`}
            >
              <Play className="size-4 fill-current" /> Descifrar y generar
              song_c_d.txt
            </button>
            <p className="mt-4 text-xs leading-5 text-stone-600">
              Betito introduce el mismo valor n, pero el algoritmo lo resta para
              regresar cada letra a su posición original.
            </p>
          </div>
        </div>

        <div className="grid gap-px border-t border-orange-100/10 bg-orange-100/10 lg:grid-cols-2">
          <div className="bg-[#100d0a] p-6 sm:p-8">
            <TextPreview
              label="Texto cifrado recibido"
              text={betitoFile?.text ?? ""}
              placeholder="El contenido de song_c.txt aparecerá aquí."
              highlight
            />
          </div>
          <div className="bg-[#0e0c09] p-6 sm:p-8">
            <div className="mb-3 flex min-h-4 items-center justify-between gap-4">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-stone-600">
                Canción recuperada
              </span>
              <Metrics value={decryptMetrics} />
            </div>
            <textarea
              value={decryptedText}
              readOnly
              placeholder="Aquí aparecerá el contenido de song_c_d.txt."
              className={`${previewClass} mt-0 text-emerald-100`}
              aria-label="Canción descifrada"
            />
            <button
              onClick={() => downloadText(decryptedText, "song_c_d.txt")}
              disabled={!decryptedText}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-orange-100/10 px-5 text-sm text-stone-300 transition hover:bg-orange-300/5 disabled:opacity-40"
            >
              <Download className="size-4" /> Descargar song_c_d.txt
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-orange-100/10 px-6 py-4">
          <button
            onClick={resetBetito}
            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-orange-200"
          >
            <RotateCcw className="size-4" /> Restablecer a Betito
          </button>
        </div>
      </section>

      <section className="grid gap-4 rounded-[1.5rem] border border-orange-100/10 bg-[#100d0a] p-6 sm:grid-cols-3 sm:p-8">
        <div className="flex gap-3">
          <FileText className="mt-0.5 size-4 shrink-0 text-orange-400" />
          <p className="text-xs leading-5 text-stone-600">
            La entrada solo puede venir de archivos TXT; no hay campo de escritura.
          </p>
        </div>
        <div className="flex gap-3">
          <FileKey2 className="mt-0.5 size-4 shrink-0 text-orange-400" />
          <p className="text-xs leading-5 text-stone-600">
            Espacios, saltos, números, acentos y signos se conservan.
          </p>
        </div>
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-orange-400" />
          <p className="text-xs leading-5 text-stone-600">
            El cifrado César es didáctico: solo tiene 26 claves posibles.
          </p>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-300/15 bg-red-300/5 px-6 py-4">
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        </div>
      ) : null}
    </div>
  );
}
