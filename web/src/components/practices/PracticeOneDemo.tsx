import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Heart,
  ImageIcon,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Play,
  RotateCcw,
  Send,
  SlidersHorizontal,
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

type GeneratedImage = { url: string; filename: string };
type UploadedImage = GeneratedImage & {
  width: number;
  height: number;
  pixelsBase64: string;
};
type RgbShift = { r: number; g: number; b: number };
type HeartResult = {
  original: string;
  cifrada: string;
  fondo_cifrado: string;
  corazon_cifrado: string;
  pixeles_corazon: number;
};

const PYODIDE_VERSION = "v314.0.6";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;
const DEFAULT_KEY: RgbShift = { r: 40, g: 80, b: 120 };
const buttonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-orange-400 px-5 text-sm font-semibold text-[#160d07] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-40";
const fieldClass =
  "h-11 w-full rounded-xl border border-orange-100/10 bg-[#0a0908] px-3 font-mono text-stone-100 outline-none transition focus:border-orange-400";

const HEART_SOURCE = String.raw`
import base64
import json
import struct

def convertir_hex(color):
    color = color.lstrip("#")
    return tuple(int(color[indice:indice + 2], 16) for indice in (0, 2, 4))

def desplazar_color(color, clave, direccion=1):
    return tuple(
        (canal + direccion * desplazamiento) % 256
        for canal, desplazamiento in zip(color, clave)
    )

def crear_mascara_corazon(ancho, alto, escala):
    centro_x = (ancho - 1) / 2
    centro_y = (alto - 1) / 2
    mascara = []
    pixeles_rellenos = 0
    for y in range(alto):
        fila = bytearray(ancho)
        normal_y = (centro_y - y) / escala
        for x in range(ancho):
            normal_x = (x - centro_x) / escala
            base = normal_x * normal_x + normal_y * normal_y - 1
            if base ** 3 - normal_x * normal_x * normal_y ** 3 <= 0:
                fila[x] = 1
                pixeles_rellenos += 1
        mascara.append(fila)
    return mascara, pixeles_rellenos

def construir_bmp(ancho, alto, fondo, corazon, mascara, clave=(0, 0, 0)):
    bytes_por_fila = ancho * 3
    relleno = (4 - bytes_por_fila % 4) % 4
    tamano_pixeles = (bytes_por_fila + relleno) * alto
    cabecera = struct.pack("<2sIHHI", b"BM", 54 + tamano_pixeles, 0, 0, 54)
    informacion = struct.pack("<IIIHHIIIIII", 40, ancho, alto, 1, 24, 0, tamano_pixeles, 2835, 2835, 0, 0)
    pixeles = bytearray()
    for y in range(alto - 1, -1, -1):
        for x in range(ancho):
            color = corazon if mascara[y][x] else fondo
            rojo, verde, azul = desplazar_color(color, clave)
            pixeles.extend((azul, verde, rojo))
        pixeles.extend(b"\x00" * relleno)
    return cabecera + informacion + pixeles

fondo = convertir_hex(color_fondo)
corazon = convertir_hex(color_corazon)
clave = (desplazamiento_r, desplazamiento_g, desplazamiento_b)
mascara, pixeles_rellenos = crear_mascara_corazon(ancho, alto, escala)
original = construir_bmp(ancho, alto, fondo, corazon, mascara)
cifrada = construir_bmp(ancho, alto, fondo, corazon, mascara, clave)
json.dumps({
    "original": base64.b64encode(original).decode("ascii"),
    "cifrada": base64.b64encode(cifrada).decode("ascii"),
    "fondo_cifrado": "#%02x%02x%02x" % desplazar_color(fondo, clave),
    "corazon_cifrado": "#%02x%02x%02x" % desplazar_color(corazon, clave),
    "pixeles_corazon": pixeles_rellenos,
})
`;

const DECRYPT_SOURCE = String.raw`
import base64
import json
import struct

pixeles_rgba = bytearray(base64.b64decode(pixeles_entrada))
clave = (desplazamiento_r, desplazamiento_g, desplazamiento_b)
bytes_por_fila = ancho * 3
relleno = (4 - bytes_por_fila % 4) % 4
tamano_pixeles = (bytes_por_fila + relleno) * alto
cabecera = struct.pack("<2sIHHI", b"BM", 54 + tamano_pixeles, 0, 0, 54)
informacion = struct.pack("<IIIHHIIIIII", 40, ancho, alto, 1, 24, 0, tamano_pixeles, 2835, 2835, 0, 0)
datos_bmp = bytearray()

for y in range(alto - 1, -1, -1):
    for x in range(ancho):
        indice = (y * ancho + x) * 4
        rojo = (pixeles_rgba[indice] - clave[0]) % 256
        verde = (pixeles_rgba[indice + 1] - clave[1]) % 256
        azul = (pixeles_rgba[indice + 2] - clave[2]) % 256
        datos_bmp.extend((azul, verde, rojo))
    datos_bmp.extend(b"\x00" * relleno)

resultado = cabecera + informacion + datos_bmp
json.dumps({"resultado": base64.b64encode(resultado).decode("ascii")})
`;

function bytesToBase64(bytes: Uint8ClampedArray) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, Math.min(offset + 32_768, bytes.length)),
    );
  }
  return window.btoa(binary);
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("El navegador no pudo decodificar el BMP."));
    image.src = url;
  });
}

function PreviewPanel({
  eyebrow,
  title,
  image,
  emptyText,
  swatches,
}: {
  eyebrow: string;
  title: string;
  image: GeneratedImage | null;
  emptyText: string;
  swatches?: [string, string];
}) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-orange-100/10 bg-[#100d0a]">
      <div className="flex items-center justify-between border-b border-orange-100/10 px-5 py-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-stone-700">
            {eyebrow}
          </p>
          <h3 className="mt-1 font-semibold text-stone-200">{title}</h3>
        </div>
        {swatches ? (
          <div className="flex gap-2">
            {swatches.map((color) => (
              <span
                key={color}
                className="size-4 rounded-full border border-white/15"
                style={{ background: color }}
                title={color}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="terminal-grid grid min-h-[320px] place-items-center p-6">
        {image ? (
          <img
            src={image.url}
            alt={title}
            className="max-h-[420px] max-w-full rounded-lg border border-orange-100/10 bg-white object-contain shadow-2xl"
          />
        ) : (
          <div className="max-w-xs text-center text-stone-700">
            <ImageIcon className="mx-auto size-8" />
            <p className="mt-4 text-sm leading-6">{emptyText}</p>
          </div>
        )}
      </div>
      <div className="border-t border-orange-100/10 p-4">
        {image ? (
          <a
            href={image.url}
            download={image.filename}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-orange-100/10 text-sm text-stone-300 transition hover:bg-orange-300/5 hover:text-white"
          >
            <Download className="size-4" /> Descargar {image.filename}
          </a>
        ) : (
          <span className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-orange-100/10 text-sm text-stone-700">
            <Download className="size-4" /> Archivo aún no disponible
          </span>
        )}
      </div>
    </article>
  );
}

const channels: Array<{
  key: keyof RgbShift;
  label: string;
  color: string;
  textClass: string;
}> = [
  { key: "r", label: "R · Rojo", color: "#f87171", textClass: "text-red-300" },
  { key: "g", label: "G · Verde", color: "#4ade80", textClass: "text-green-300" },
  { key: "b", label: "B · Azul", color: "#60a5fa", textClass: "text-blue-300" },
];

function RgbShiftControl({
  value,
  onChange,
  operation,
}: {
  value: RgbShift;
  onChange: (value: RgbShift) => void;
  operation: "encrypt" | "decrypt";
}) {
  const symbol = operation === "encrypt" ? "+" : "−";
  return (
    <div className="space-y-4 rounded-2xl border border-orange-100/10 bg-[#0a0908] p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-300">
        <SlidersHorizontal className="size-4 text-orange-400" />
        Clave de desplazamiento RGB
      </div>
      {channels.map((channel) => (
        <div key={channel.key}>
          <div className="flex items-center justify-between">
            <label
              htmlFor={`${operation}-${channel.key}`}
              className={`font-mono text-xs ${channel.textClass}`}
            >
              {channel.label}
            </label>
            <input
              type="number"
              min={0}
              max={255}
              value={value[channel.key]}
              onChange={(event) =>
                onChange({
                  ...value,
                  [channel.key]: Math.min(
                    255,
                    Math.max(0, Number.parseInt(event.target.value || "0", 10)),
                  ),
                })
              }
              className="h-8 w-20 rounded-lg border border-orange-100/10 bg-[#100d0a] text-center font-mono text-xs text-stone-200 outline-none focus:border-orange-400"
              aria-label={`Desplazamiento ${channel.label}`}
            />
          </div>
          <input
            id={`${operation}-${channel.key}`}
            type="range"
            min={0}
            max={255}
            step={1}
            value={value[channel.key]}
            onChange={(event) =>
              onChange({
                ...value,
                [channel.key]: Number.parseInt(event.target.value, 10),
              })
            }
            className="mt-2 w-full"
            style={{ accentColor: channel.color }}
          />
        </div>
      ))}
      <p className="border-t border-orange-100/10 pt-4 font-mono text-[11px] leading-5 text-stone-600">
        {operation === "encrypt"
          ? `Cifrado: (R ${symbol} ${value.r}, G ${symbol} ${value.g}, B ${symbol} ${value.b}) mod 256`
          : `Descifrado: (R' ${symbol} ${value.r}, G' ${symbol} ${value.g}, B' ${symbol} ${value.b}) mod 256`}
      </p>
    </div>
  );
}

export default function PracticeOneDemo() {
  const runtimeRef = useRef<PyodideRuntime | null>(null);
  const initializingRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "running" | "error">(
    "loading",
  );
  const [width, setWidth] = useState("320");
  const [height, setHeight] = useState("320");
  const [heartScale, setHeartScale] = useState("100");
  const [backgroundColor, setBackgroundColor] = useState("#fff7ed");
  const [heartColor, setHeartColor] = useState("#e11d48");
  const [encryptKey, setEncryptKey] = useState<RgbShift>({ ...DEFAULT_KEY });
  const [decryptKey, setDecryptKey] = useState<RgbShift>({ ...DEFAULT_KEY });
  const [original, setOriginal] = useState<GeneratedImage | null>(null);
  const [encrypted, setEncrypted] = useState<GeneratedImage | null>(null);
  const [encryptedBackground, setEncryptedBackground] = useState("#274765");
  const [encryptedHeart, setEncryptedHeart] = useState("#096dc0");
  const [heartPixelCount, setHeartPixelCount] = useState<number | null>(null);
  const [received, setReceived] = useState<UploadedImage | null>(null);
  const [decrypted, setDecrypted] = useState<GeneratedImage | null>(null);
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
        String(runtime.runPython(HEART_SOURCE)),
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
      const parsed = JSON.parse(
        String(runtime.runPython(DECRYPT_SOURCE)),
      ) as { resultado: string };
      setDecrypted({
        url: `data:image/bmp;base64,${parsed.resultado}`,
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
    setEncryptKey({ ...DEFAULT_KEY });
    setOriginal(null);
    setEncrypted(null);
    setEncryptedBackground("#274765");
    setEncryptedHeart("#096dc0");
    setHeartPixelCount(null);
    setError(null);
  }

  function resetBetito() {
    setDecryptKey({ ...DEFAULT_KEY });
    setReceived(null);
    setDecrypted(null);
    setError(null);
  }

  const busy = status === "loading" || status === "running";
  const statusLabel =
    status === "ready"
      ? "Python listo"
      : status === "running"
        ? "Procesando"
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
              Crear un corazón y generar img_c.bmp
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
        <PreviewPanel
          eyebrow="Antes del cifrado"
          title="Corazón original"
          image={original}
          swatches={[backgroundColor, heartColor]}
          emptyText="Alicia debe crear y cifrar el corazón para mostrar el original."
        />
        <PreviewPanel
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
            <label className="grid min-h-52 cursor-pointer place-items-center rounded-2xl border border-dashed border-orange-300/25 bg-[#0a0908] p-8 text-center transition hover:border-orange-300/60">
              <input
                type="file"
                accept=".bmp,image/bmp"
                className="sr-only"
                onChange={(event) => void selectEncryptedFile(event.target.files?.[0])}
              />
              <span>
                <Upload className="mx-auto size-8 text-orange-400" />
                <span className="mt-4 block font-medium text-stone-200">
                  {received ? received.filename : "Seleccionar img_c.bmp"}
                </span>
                <span className="mt-2 block text-xs leading-5 text-stone-600">
                  Archivo BMP · máximo 12 MB
                </span>
                {received ? (
                  <span className="mt-3 block font-mono text-[10px] text-orange-300">
                    {received.width} × {received.height} px
                  </span>
                ) : null}
              </span>
            </label>
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
        <PreviewPanel
          eyebrow="Recibido por Betito"
          title="BMP cifrado"
          image={received}
          emptyText="Betito debe cargar aquí el archivo img_c.bmp."
        />
        <PreviewPanel
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
