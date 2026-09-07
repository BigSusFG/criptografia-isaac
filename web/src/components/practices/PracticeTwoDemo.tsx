import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileKey2,
  FileText,
  KeyRound,
  LockKeyhole,
  Music2,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import FileDrop from "../ui/FileDrop";
import RuntimeStatus, { type RuntimeState } from "../ui/RuntimeStatus";
import { AlphabetShiftControl } from "../ui/ShiftControls";
import {
  Metrics,
  TextPreview,
  textPreviewClass,
  type CipherMetrics,
} from "../ui/TextPanels";
import { downloadText, readTextFile } from "../../lib/files";
import {
  loadPythonRuntime,
  type PyodideRuntime,
} from "../../lib/pyodide";
import pythonSource from "../../python/practica_02.py?raw";

type TextFile = { name: string; text: string };
type CipherResult = CipherMetrics & {
  salida: string;
  operacion: "cifrar" | "descifrar";
};

const buttonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-orange-400 px-5 text-sm font-semibold text-[#160d07] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-40";
const RUN_CIPHER_CALL =
  "generar_resultado(texto_entrada, desplazamiento, operacion)";

export default function PracticeTwoDemo() {
  const runtimeRef = useRef<PyodideRuntime | null>(null);
  const [status, setStatus] = useState<RuntimeState>("loading");
  const [aliciaFile, setAliciaFile] = useState<TextFile | null>(null);
  const [betitoFile, setBetitoFile] = useState<TextFile | null>(null);
  const [encryptShift, setEncryptShift] = useState(3);
  const [decryptShift, setDecryptShift] = useState(3);
  const [encryptedText, setEncryptedText] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [encryptMetrics, setEncryptMetrics] = useState<CipherResult | null>(null);
  const [decryptMetrics, setDecryptMetrics] = useState<CipherResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        if (cancelled) return;
        setStatus("error");
        setError("No fue posible cargar Python. Revisa tu conexión e intenta nuevamente.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
        String(runtime.runPython(RUN_CIPHER_CALL)),
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
          <RuntimeStatus status={status} runningLabel="Procesando texto" />
        </div>

        <div className="grid gap-px bg-orange-100/10 lg:grid-cols-[1fr_0.9fr]">
          <div className="bg-[#100d0a] p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-stone-300">
              <Music2 className="size-4 text-orange-400" />
              Archivo de canción de Alicia
            </div>
            <FileDrop
              accept=".txt,text/plain"
              emptyLabel="Seleccionar canción .txt"
              filename={aliciaFile?.name ?? null}
              hint="Solo archivos TXT en UTF-8 · máximo 1 MB"
              onFile={(file) => void selectTextFile(file, "alicia")}
            />
          </div>
          <div className="bg-[#0e0c09] p-6 sm:p-8">
            <AlphabetShiftControl
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
              className={`${textPreviewClass} text-orange-100`}
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
              accept=".txt,text/plain"
              emptyLabel="Seleccionar song_c.txt"
              filename={betitoFile?.name ?? null}
              hint="Archivo cifrado recibido de Alicia · máximo 1 MB"
              onFile={(file) => void selectTextFile(file, "betito")}
            />
          </div>
          <div className="bg-[#0e0c09] p-6 sm:p-8">
            <AlphabetShiftControl
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
              className={`${textPreviewClass} text-emerald-100`}
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
