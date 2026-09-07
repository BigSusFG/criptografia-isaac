import { useEffect, useRef, useState } from "react";
import {
  Heart,
  KeyRound,
  LockKeyhole,
  Play,
  RotateCcw,
  Send,
  UserRoundCheck,
} from "lucide-react";
import FileDrop from "../ui/FileDrop";
import ImagePreviewPanel, {
  type GeneratedImage,
} from "../ui/ImagePreviewPanel";
import RuntimeStatus, { type RuntimeState } from "../ui/RuntimeStatus";
import {
  DEFAULT_RGB_SHIFT,
  RgbShiftControl,
  type RgbShift,
} from "../ui/ShiftControls";
import { bytesToBase64, loadImage, readAsDataUrl } from "../../lib/files";
import {
  loadPythonRuntime,
  type PyodideRuntime,
} from "../../lib/pyodide";
import pythonSource from "../../python/practica_01.py?raw";

type UploadedImage = GeneratedImage & {
  width: number;
  height: number;
  pixelsBase64: string;
};
type HeartResult = {
  original: string;
  cifrada: string;
  fondo_cifrado: string;
  corazon_cifrado: string;
  pixeles_corazon: number;
};

const buttonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-orange-400 px-5 text-sm font-semibold text-[#160d07] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-40";
const fieldClass =
  "h-11 w-full rounded-xl border border-orange-100/10 bg-[#0a0908] px-3 font-mono text-stone-100 outline-none transition focus:border-orange-400";
const GENERATE_HEART_CALL = `generar_paquete_cifrado(
    ancho,
    alto,
    escala,
    color_fondo,
    color_corazon,
    desplazamiento_r,
    desplazamiento_g,
    desplazamiento_b,
)`;
const DECRYPT_IMAGE_CALL = `descifrar_pixeles_rgba_a_bmp(
    pixeles_entrada,
    ancho,
    alto,
    desplazamiento_r,
    desplazamiento_g,
    desplazamiento_b,
)`;

export default function PracticeOneDemo() {
  const runtimeRef = useRef<PyodideRuntime | null>(null);
  const [status, setStatus] = useState<RuntimeState>("loading");
  const [width, setWidth] = useState("320");
  const [height, setHeight] = useState("320");
  const [heartScale, setHeartScale] = useState("100");
  const [backgroundColor, setBackgroundColor] = useState("#fff7ed");
  const [heartColor, setHeartColor] = useState("#e11d48");
  const [encryptKey, setEncryptKey] = useState<RgbShift>({ ...DEFAULT_RGB_SHIFT });
  const [decryptKey, setDecryptKey] = useState<RgbShift>({ ...DEFAULT_RGB_SHIFT });
  const [original, setOriginal] = useState<GeneratedImage | null>(null);
  const [encrypted, setEncrypted] = useState<GeneratedImage | null>(null);
  const [encryptedBackground, setEncryptedBackground] = useState("#274765");
  const [encryptedHeart, setEncryptedHeart] = useState("#096dc0");
  const [heartPixelCount, setHeartPixelCount] = useState<number | null>(null);
  const [received, setReceived] = useState<UploadedImage | null>(null);
  const [decrypted, setDecrypted] = useState<GeneratedImage | null>(null);
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

  function validateHeart() {
    const parsedWidth = Number.parseInt(width, 10);
    const parsedHeight = Number.parseInt(height, 10);
    const parsedScale = Number.parseInt(heartScale, 10);
    if (
      !Number.isInteger(parsedWidth) ||
      !Number.isInteger(parsedHeight) ||
      parsedWidth < 64 ||
      parsedHeight < 64 ||
      parsedWidth > 1024 ||
      parsedHeight > 1024
    ) {
      return "El ancho y el alto deben estar entre 64 y 1024 píxeles.";
    }
    const maximumScale = Math.floor(Math.min(parsedWidth, parsedHeight) * 0.4);
    if (
      !Number.isInteger(parsedScale) ||
      parsedScale < 12 ||
      parsedScale > maximumScale
    ) {
      return `La escala del corazón debe estar entre 12 y ${maximumScale} píxeles.`;
    }
    return null;
  }

  function encryptHeart() {
    const runtime = runtimeRef.current;
    const validationError = validateHeart();
    if (!runtime) {
      setError("Python todavía se está cargando.");
      return;
    }
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStatus("running");
    try {
      runtime.globals.set("ancho", Number.parseInt(width, 10));
      runtime.globals.set("alto", Number.parseInt(height, 10));
      runtime.globals.set("escala", Number.parseInt(heartScale, 10));
      runtime.globals.set("color_fondo", backgroundColor);
      runtime.globals.set("color_corazon", heartColor);
      runtime.globals.set("desplazamiento_r", encryptKey.r);
      runtime.globals.set("desplazamiento_g", encryptKey.g);
      runtime.globals.set("desplazamiento_b", encryptKey.b);
      const parsed = JSON.parse(
        String(runtime.runPython(GENERATE_HEART_CALL)),
      ) as HeartResult;
      setOriginal({
        url: `data:image/bmp;base64,${parsed.original}`,
        filename: "img_original.bmp",
      });
      setEncrypted({
        url: `data:image/bmp;base64,${parsed.cifrada}`,
        filename: "img_c.bmp",
      });
      setEncryptedBackground(parsed.fondo_cifrado);
      setEncryptedHeart(parsed.corazon_cifrado);
      setHeartPixelCount(parsed.pixeles_corazon);
      setStatus("ready");
    } catch {
      setStatus("error");
      setError("No fue posible construir y cifrar el corazón BMP.");
    }
  }

  async function selectEncryptedFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".bmp")) {
      setError("Betito debe seleccionar el archivo BMP recibido, idealmente img_c.bmp.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("La imagen debe pesar 12 MB o menos.");
      return;
    }
    setError(null);
    try {
      const url = await readAsDataUrl(file);
      const image = await loadImage(url);
      if (image.naturalWidth > 2048 || image.naturalHeight > 2048) {
        setError("La imagen puede medir como máximo 2048 × 2048 píxeles.");
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("No se pudo leer la imagen.");
      context.drawImage(image, 0, 0);
      setReceived({
        url,
        filename: file.name,
        width: canvas.width,
        height: canvas.height,
        pixelsBase64: bytesToBase64(
          context.getImageData(0, 0, canvas.width, canvas.height).data,
        ),
      });
      setDecrypted(null);
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "No se pudo cargar el archivo BMP.",
      );
    }
  }

  function decryptImage() {
    const runtime = runtimeRef.current;
    if (!runtime) {
      setError("Python todavía se está cargando.");
      return;
    }
    if (!received) {
      setError("Betito debe cargar primero el archivo img_c.bmp.");
      return;
    }
    setError(null);
    setStatus("running");
    try {
      runtime.globals.set("pixeles_entrada", received.pixelsBase64);
      runtime.globals.set("ancho", received.width);
      runtime.globals.set("alto", received.height);
      runtime.globals.set("desplazamiento_r", decryptKey.r);
      runtime.globals.set("desplazamiento_g", decryptKey.g);
      runtime.globals.set("desplazamiento_b", decryptKey.b);
      const resultBase64 = String(runtime.runPython(DECRYPT_IMAGE_CALL));
      setDecrypted({
        url: `data:image/bmp;base64,${resultBase64}`,
        filename: "img_c_d.bmp",
      });
      setStatus("ready");
    } catch {
      setStatus("error");
      setError("No fue posible descifrar los píxeles del BMP.");
    }
  }

  function resetAlicia() {
    setWidth("320");
    setHeight("320");
    setHeartScale("100");
    setBackgroundColor("#fff7ed");
    setHeartColor("#e11d48");
    setEncryptKey({ ...DEFAULT_RGB_SHIFT });
    setOriginal(null);
    setEncrypted(null);
    setEncryptedBackground("#274765");
    setEncryptedHeart("#096dc0");
    setHeartPixelCount(null);
    setError(null);
  }

  function resetBetito() {
    setDecryptKey({ ...DEFAULT_RGB_SHIFT });
    setReceived(null);
    setDecrypted(null);
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
              Crear un corazón y generar img_c.bmp
            </h2>
          </div>
          <RuntimeStatus status={status} />
        </div>

        <div className="grid gap-px bg-orange-100/10 lg:grid-cols-[1fr_0.9fr]">
          <div className="bg-[#100d0a] p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-stone-300">
              <Heart className="size-4 fill-orange-400/20 text-orange-400" />
              Imagen base de Alicia
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                ["Ancho (px)", width, setWidth],
                ["Alto (px)", height, setHeight],
                ["Escala corazón", heartScale, setHeartScale],
              ].map(([label, value, setter]) => (
                <label
                  key={label as string}
                  className="space-y-2 font-mono text-xs text-stone-500"
                >
                  {label as string}
                  <input
                    type="number"
                    value={value as string}
                    onChange={(event) => {
                      (setter as (value: string) => void)(event.target.value);
                      setOriginal(null);
                      setEncrypted(null);
                    }}
                    className={fieldClass}
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-orange-100/10 bg-[#0a0908] p-4">
                <span>
                  <span className="block text-sm font-medium text-stone-300">
                    Color del fondo
                  </span>
                  <span className="mt-1 block font-mono text-[10px] text-stone-600">
                    {backgroundColor}
                  </span>
                </span>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(event) => {
                    setBackgroundColor(event.target.value);
                    setOriginal(null);
                    setEncrypted(null);
                  }}
                  className="h-11 w-14 cursor-pointer rounded-lg border border-orange-100/10 bg-transparent p-1"
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-orange-100/10 bg-[#0a0908] p-4">
                <span>
                  <span className="block text-sm font-medium text-stone-300">
                    Color del corazón
                  </span>
                  <span className="mt-1 block font-mono text-[10px] text-stone-600">
                    {heartColor}
                  </span>
                </span>
                <input
                  type="color"
                  value={heartColor}
                  onChange={(event) => {
                    setHeartColor(event.target.value);
                    setOriginal(null);
                    setEncrypted(null);
                  }}
                  className="h-11 w-14 cursor-pointer rounded-lg border border-orange-100/10 bg-transparent p-1"
                />
              </label>
            </div>
            <p className="mt-5 text-xs leading-5 text-stone-600">
              El corazón se calcula píxel por píxel y se escribe manualmente como un
              BMP de 24 bits.
            </p>
          </div>

          <div className="bg-[#0e0c09] p-6 sm:p-8">
            <RgbShiftControl
              value={encryptKey}
              onChange={(value) => {
                setEncryptKey(value);
                setEncrypted(null);
              }}
              operation="encrypt"
            />
            <button
              onClick={encryptHeart}
              disabled={busy}
              className={`${buttonClass} mt-6 w-full sm:w-auto`}
            >
              <LockKeyhole className="size-4" /> Cifrar y generar img_c.bmp
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-orange-100/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] uppercase tracking-wider text-stone-700">
            {heartPixelCount
              ? `${heartPixelCount.toLocaleString("es-MX")} píxeles forman el corazón`
              : "Alicia configura la imagen y su clave RGB"}
          </p>
          <button
            onClick={resetAlicia}
            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-orange-200"
          >
            <RotateCcw className="size-4" /> Restablecer a Alicia
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ImagePreviewPanel
          eyebrow="Antes del cifrado"
          title="Corazón original"
          image={original}
          swatches={[backgroundColor, heartColor]}
          emptyText="Alicia debe crear y cifrar el corazón para mostrar el original."
        />
        <ImagePreviewPanel
          eyebrow={`Cifrado · R+${encryptKey.r} G+${encryptKey.g} B+${encryptKey.b}`}
          title="Archivo para compartir"
          image={encrypted}
          swatches={[encryptedBackground, encryptedHeart]}
          emptyText="Aquí aparecerá img_c.bmp con sus colores desplazados."
        />
      </div>

      <section className="rounded-[1.5rem] border border-orange-300/20 bg-orange-300/[0.045] px-6 py-6 sm:px-8">
        <div className="grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
          <span className="grid size-12 place-items-center rounded-full border border-orange-300/25 bg-orange-300/10 text-orange-300">
            <Send className="size-5" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400">
              Entrega del mensaje
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              Alicia envía <strong className="text-stone-200">img_c.bmp</strong> a
              Betito por WhatsApp como documento y le comunica verbalmente la clave R,
              G y B.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-orange-100/10 px-4 py-2 font-mono text-[11px] text-orange-200">
            <KeyRound className="size-4" /> R {encryptKey.r} · G {encryptKey.g} · B{" "}
            {encryptKey.b}
          </div>
        </div>
        <p className="mt-4 border-t border-orange-100/10 pt-4 text-xs leading-5 text-stone-600">
          Debe enviarse como documento, no como foto. La compresión de WhatsApp
          modificaría los píxeles e impediría una recuperación exacta.
        </p>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border border-orange-100/10 bg-[#100d0a]">
        <div className="border-b border-orange-100/10 px-6 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400">
            Parte 2 · Betito descifra
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            Recibir img_c.bmp y recuperar img_c_d.bmp
          </h2>
        </div>

        <div className="grid gap-px bg-orange-100/10 lg:grid-cols-[1fr_0.9fr]">
          <div className="bg-[#100d0a] p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-stone-300">
              <UserRoundCheck className="size-4 text-orange-400" />
              Archivo recibido por Betito
            </div>
            <FileDrop
              accept=".bmp,image/bmp"
              emptyLabel="Seleccionar img_c.bmp"
              filename={received?.filename ?? null}
              hint="Archivo BMP · máximo 12 MB"
              metadata={received ? `${received.width} × ${received.height} px` : undefined}
              onFile={(file) => void selectEncryptedFile(file)}
            />
          </div>

          <div className="bg-[#0e0c09] p-6 sm:p-8">
            <RgbShiftControl
              value={decryptKey}
              onChange={(value) => {
                setDecryptKey(value);
                setDecrypted(null);
              }}
              operation="decrypt"
            />
            <button
              onClick={decryptImage}
              disabled={busy || !received}
              className={`${buttonClass} mt-6 w-full sm:w-auto`}
            >
              <Play className="size-4 fill-current" /> Descifrar y generar img_c_d.bmp
            </button>
            <p className="mt-4 text-xs leading-5 text-stone-600">
              Betito debe introducir exactamente la misma clave que Alicia utilizó.
              Ahora los valores se restan módulo 256.
            </p>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <ImagePreviewPanel
          eyebrow="Recibido por Betito"
          title="BMP cifrado"
          image={received}
          emptyText="Betito debe cargar aquí el archivo img_c.bmp."
        />
        <ImagePreviewPanel
          eyebrow={`Descifrado · R−${decryptKey.r} G−${decryptKey.g} B−${decryptKey.b}`}
          title="Corazón recuperado"
          image={decrypted}
          emptyText="Aquí aparecerá img_c_d.bmp después de restar la clave."
        />
      </div>

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
