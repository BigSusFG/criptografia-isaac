import { useCallback, useEffect, useRef, useState } from "react";
import { CircleDot, Download, ImageIcon, LoaderCircle, Play, RotateCcw, SlidersHorizontal, Upload } from "lucide-react";

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
type UploadedImage = GeneratedImage & { width: number; height: number; pixelsBase64: string };
type CircleResult = {
  original: string;
  resultado: string;
  fondo_resultado: string;
  circulo_resultado: string;
  pixeles_circulo: number;
};

const PYODIDE_VERSION = "v314.0.6";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;
const buttonClass = "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-orange-400 px-5 text-sm font-semibold text-[#160d07] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-40";

const CIRCLE_SOURCE = String.raw`
import base64
import json
import struct

def convertir_hex(color):
    color = color.lstrip("#")
    return tuple(int(color[indice:indice + 2], 16) for indice in (0, 2, 4))

def filas_circulo_relleno(ancho, alto, radio):
    centro_x, centro_y = ancho // 2, alto // 2
    x, y, decision = 0, radio, 1 - radio
    filas = {}

    def registrar_fila(fila, izquierda, derecha):
        if not 0 <= fila < alto:
            return
        izquierda = max(0, izquierda)
        derecha = min(ancho - 1, derecha)
        if izquierda > derecha:
            return
        anterior = filas.get(fila)
        filas[fila] = (
            min(anterior[0], izquierda) if anterior else izquierda,
            max(anterior[1], derecha) if anterior else derecha,
        )

    while x <= y:
        registrar_fila(centro_y + y, centro_x - x, centro_x + x)
        registrar_fila(centro_y - y, centro_x - x, centro_x + x)
        registrar_fila(centro_y + x, centro_x - y, centro_x + y)
        registrar_fila(centro_y - x, centro_x - y, centro_x + y)
        x += 1
        if decision < 0:
            decision += 2 * x + 1
        else:
            y -= 1
            decision += 2 * (x - y) + 1
    return filas

def desplazar_color(color, desplazamiento):
    return tuple((canal + desplazamiento) % 256 for canal in color)

def construir_bmp(ancho, alto, fondo, circulo, filas, desplazamiento=0):
    bytes_por_fila = ancho * 3
    relleno = (4 - bytes_por_fila % 4) % 4
    tamano_pixeles = (bytes_por_fila + relleno) * alto
    cabecera = struct.pack("<2sIHHI", b"BM", 54 + tamano_pixeles, 0, 0, 54)
    informacion = struct.pack("<IIIHHIIIIII", 40, ancho, alto, 1, 24, 0, tamano_pixeles, 2835, 2835, 0, 0)
    pixeles = bytearray()
    for fila_y in range(alto - 1, -1, -1):
        tramo = filas.get(fila_y)
        for columna_x in range(ancho):
            dentro = tramo is not None and tramo[0] <= columna_x <= tramo[1]
            color = circulo if dentro else fondo
            rojo, verde, azul = desplazar_color(color, desplazamiento)
            pixeles.extend((azul, verde, rojo))
        pixeles.extend(b"\x00" * relleno)
    return cabecera + informacion + pixeles

fondo = convertir_hex(color_fondo)
circulo = convertir_hex(color_circulo)
filas = filas_circulo_relleno(ancho, alto, radio)
original = construir_bmp(ancho, alto, fondo, circulo, filas)
resultado = construir_bmp(ancho, alto, fondo, circulo, filas, desplazamiento)
json.dumps({
    "original": base64.b64encode(original).decode("ascii"),
    "resultado": base64.b64encode(resultado).decode("ascii"),
    "fondo_resultado": "#%02x%02x%02x" % desplazar_color(fondo, desplazamiento),
    "circulo_resultado": "#%02x%02x%02x" % desplazar_color(circulo, desplazamiento),
    "pixeles_circulo": sum(derecha - izquierda + 1 for izquierda, derecha in filas.values()),
})
`;

const IMAGE_SOURCE = String.raw`
import base64
import json
pixeles = bytearray(base64.b64decode(pixeles_entrada))
for indice in range(0, len(pixeles), 4):
    pixeles[indice] = (pixeles[indice] + desplazamiento) % 256
    pixeles[indice + 1] = (pixeles[indice + 1] + desplazamiento) % 256
    pixeles[indice + 2] = (pixeles[indice + 2] + desplazamiento) % 256
json.dumps({"pixeles": base64.b64encode(pixeles).decode("ascii")})
`;

function bytesToBase64(bytes: Uint8ClampedArray) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 32_768, bytes.length)));
  }
  return window.btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8ClampedArray(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
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
    image.onerror = () => reject(new Error("El navegador no pudo decodificar la imagen."));
    image.src = url;
  });
}

function pixelsToPng(bytes: Uint8ClampedArray, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No fue posible crear el resultado.");
  const pixels = new Uint8ClampedArray(bytes.length);
  pixels.set(bytes);
  context.putImageData(new ImageData(pixels, width, height), 0, 0);
  return canvas.toDataURL("image/png");
}

function PreviewPanel({ eyebrow, title, image, emptyText, swatches }: { eyebrow: string; title: string; image: GeneratedImage | null; emptyText: string; swatches?: [string, string] }) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-orange-100/10 bg-[#100d0a]">
      <div className="flex items-center justify-between border-b border-orange-100/10 px-5 py-4">
        <div><p className="font-mono text-[9px] uppercase tracking-[0.2em] text-stone-700">{eyebrow}</p><h3 className="mt-1 font-semibold text-stone-200">{title}</h3></div>
        {swatches ? <div className="flex gap-2">{swatches.map((color) => <span key={color} className="size-4 rounded-full border border-white/15" style={{ background: color }} title={color} />)}</div> : null}
      </div>
      <div className="terminal-grid grid min-h-[330px] place-items-center p-6">
        {image ? <img src={image.url} alt={title} className="max-h-[420px] max-w-full rounded-lg border border-orange-100/10 bg-white object-contain shadow-2xl" /> : <div className="max-w-xs text-center text-stone-700"><ImageIcon className="mx-auto size-8" /><p className="mt-4 text-sm leading-6">{emptyText}</p></div>}
      </div>
      <div className="border-t border-orange-100/10 p-4">
        {image ? <a href={image.url} download={image.filename} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-orange-100/10 text-sm text-stone-300 transition hover:bg-orange-300/5 hover:text-white"><Download className="size-4" /> Descargar {image.filename}</a> : <span className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-orange-100/10 text-sm text-stone-700"><Download className="size-4" /> Archivo aún no disponible</span>}
      </div>
    </article>
  );
}

function ShiftControl({ shift, onChange }: { shift: number; onChange: (value: number) => void }) {
  return (
    <div className="rounded-xl border border-orange-100/10 bg-[#0a0908] p-5">
      <div className="flex items-center justify-between"><span className="font-mono text-xs text-stone-500">Desplazamiento RGB</span><input type="number" min={0} max={255} value={shift} onChange={(event) => onChange(Math.min(255, Math.max(0, Number.parseInt(event.target.value || "0", 10))))} className="h-9 w-20 rounded-lg border border-orange-100/10 bg-[#100d0a] text-center font-mono text-orange-300 outline-none focus:border-orange-400" /></div>
      <input type="range" min={0} max={255} step={1} value={shift} onChange={(event) => onChange(Number.parseInt(event.target.value, 10))} className="mt-7 w-full accent-orange-400" />
      <div className="mt-3 flex justify-between font-mono text-[9px] text-stone-700"><span>0</span><span>128</span><span>255</span></div>
      <p className="mt-4 font-mono text-xs leading-5 text-stone-600">nuevo canal = (canal original + {shift}) mod 256</p>
    </div>
  );
}

export default function PracticeOneDemo() {
  const runtimeRef = useRef<PyodideRuntime | null>(null);
  const initializingRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "running" | "error">("loading");
  const [mode, setMode] = useState<"create" | "upload">("create");
  const [width, setWidth] = useState("320");
  const [height, setHeight] = useState("320");
  const [radius, setRadius] = useState("100");
  const [backgroundColor, setBackgroundColor] = useState("#0a0908");
  const [circleColor, setCircleColor] = useState("#fb923c");
  const [shift, setShift] = useState(80);
  const [original, setOriginal] = useState<GeneratedImage | null>(null);
  const [shifted, setShifted] = useState<GeneratedImage | null>(null);
  const [shiftedBackground, setShiftedBackground] = useState("#5a5958");
  const [shiftedCircle, setShiftedCircle] = useState("#4be28c");
  const [filledPixelCount, setFilledPixelCount] = useState<number | null>(null);
  const [uploaded, setUploaded] = useState<UploadedImage | null>(null);
  const [uploadedResult, setUploadedResult] = useState<GeneratedImage | null>(null);
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

  function validateCircle() {
    const parsedWidth = Number.parseInt(width, 10);
    const parsedHeight = Number.parseInt(height, 10);
    const parsedRadius = Number.parseInt(radius, 10);
    if (!Number.isInteger(parsedWidth) || !Number.isInteger(parsedHeight) || parsedWidth < 32 || parsedHeight < 32 || parsedWidth > 1024 || parsedHeight > 1024) return "El ancho y el alto deben estar entre 32 y 1024 píxeles.";
    const maxRadius = Math.floor(Math.min(parsedWidth, parsedHeight) / 2) - 2;
    if (!Number.isInteger(parsedRadius) || parsedRadius < 1 || parsedRadius > maxRadius) return `El radio debe estar entre 1 y ${maxRadius} píxeles.`;
    return null;
  }

  function generateCircle(applyShift: boolean) {
    const runtime = runtimeRef.current;
    const validationError = validateCircle();
    if (!runtime) { setError("Python todavía se está cargando."); return; }
    if (validationError) { setError(validationError); return; }
    setError(null); setStatus("running");
    try {
      runtime.globals.set("ancho", Number.parseInt(width, 10));
      runtime.globals.set("alto", Number.parseInt(height, 10));
      runtime.globals.set("radio", Number.parseInt(radius, 10));
      runtime.globals.set("color_fondo", backgroundColor);
      runtime.globals.set("color_circulo", circleColor);
      runtime.globals.set("desplazamiento", applyShift ? shift : 0);
      const parsed = JSON.parse(String(runtime.runPython(CIRCLE_SOURCE))) as CircleResult;
      setOriginal({ url: `data:image/bmp;base64,${parsed.original}`, filename: "circulo_relleno_original.bmp" });
      setFilledPixelCount(parsed.pixeles_circulo);
      if (applyShift) {
        setShifted({ url: `data:image/bmp;base64,${parsed.resultado}`, filename: `circulo_relleno_desplazamiento_${shift}.bmp` });
        setShiftedBackground(parsed.fondo_resultado); setShiftedCircle(parsed.circulo_resultado);
      } else setShifted(null);
      setStatus("ready");
    } catch { setStatus("error"); setError("Ocurrió un error al construir el archivo BMP."); }
  }

  async function selectImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Selecciona un archivo de imagen válido."); return; }
    if (file.size > 12 * 1024 * 1024) { setError("La imagen debe pesar 12 MB o menos."); return; }
    setError(null);
    try {
      const url = await readAsDataUrl(file);
      const image = await loadImage(url);
      if (image.naturalWidth > 2048 || image.naturalHeight > 2048) { setError("La imagen puede medir como máximo 2048 × 2048 píxeles."); return; }
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("No se pudo leer la imagen.");
      context.drawImage(image, 0, 0);
      setUploaded({ url, filename: file.name, width: canvas.width, height: canvas.height, pixelsBase64: bytesToBase64(context.getImageData(0, 0, canvas.width, canvas.height).data) });
      setUploadedResult(null);
    } catch (imageError) { setError(imageError instanceof Error ? imageError.message : "No se pudo cargar la imagen."); }
  }

  function processUploadedImage() {
    const runtime = runtimeRef.current;
    if (!runtime) { setError("Python todavía se está cargando."); return; }
    if (!uploaded) { setError("Primero selecciona una imagen."); return; }
    setError(null); setStatus("running");
    try {
      runtime.globals.set("pixeles_entrada", uploaded.pixelsBase64);
      runtime.globals.set("desplazamiento", shift);
      const parsed = JSON.parse(String(runtime.runPython(IMAGE_SOURCE))) as { pixeles: string };
      const stem = uploaded.filename.replace(/\.[^.]+$/, "");
      setUploadedResult({ url: pixelsToPng(base64ToBytes(parsed.pixeles), uploaded.width, uploaded.height), filename: `${stem}_desplazado_${shift}.png` });
      setStatus("ready");
    } catch { setStatus("error"); setError("No fue posible desplazar los píxeles de la imagen."); }
  }

  function resetCircle() {
    setWidth("320"); setHeight("320"); setRadius("100"); setBackgroundColor("#0a0908"); setCircleColor("#fb923c"); setShift(80);
    setOriginal(null); setShifted(null); setFilledPixelCount(null); setError(null);
  }

  const busy = status === "loading" || status === "running";
  const statusLabel = status === "ready" ? "Python listo" : status === "running" ? "Procesando" : status === "error" ? "Error" : "Cargando Python";

  return (
    <>
      <div className="overflow-hidden rounded-[1.75rem] border border-orange-100/10 bg-[#100d0a]">
        <div className="flex flex-col gap-4 border-b border-orange-100/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-700">Laboratorio de imagen</p><h2 className="mt-1 text-xl font-semibold">Genera un BMP o procesa tu propia imagen</h2></div>
          <div className={`flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider ${status === "ready" ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : status === "error" ? "border-red-300/25 bg-red-300/10 text-red-200" : "border-orange-300/20 bg-orange-300/5 text-orange-200"}`}>{busy ? <LoaderCircle className="size-3 animate-spin" /> : <span className="size-1.5 rounded-full bg-current" />}{statusLabel}</div>
        </div>

        <div className="flex gap-5 border-b border-orange-100/10 px-6 pt-4">
          <button onClick={() => setMode("create")} className={`flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-medium transition ${mode === "create" ? "border-orange-400 text-orange-300" : "border-transparent text-stone-600 hover:text-stone-300"}`}><CircleDot className="size-4" /> Crear círculo BMP</button>
          <button onClick={() => setMode("upload")} className={`flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-medium transition ${mode === "upload" ? "border-orange-400 text-orange-300" : "border-transparent text-stone-600 hover:text-stone-300"}`}><Upload className="size-4" /> Cargar una imagen</button>
        </div>

        {mode === "create" ? (
          <>
            <div className="grid gap-px bg-orange-100/10 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="bg-[#100d0a] p-6 sm:p-8">
                <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-stone-300"><ImageIcon className="size-4 text-orange-400" /> 1. Imagen y círculo relleno</div>
                <div className="grid gap-5 sm:grid-cols-3">{[["Ancho (px)", width, setWidth], ["Alto (px)", height, setHeight], ["Radio (px)", radius, setRadius]].map(([label, value, setter]) => <label key={label as string} className="space-y-2 font-mono text-xs text-stone-500">{label as string}<input type="number" value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="h-11 w-full rounded-xl border border-orange-100/10 bg-[#0a0908] px-3 font-mono text-stone-100 outline-none focus:border-orange-400" /></label>)}</div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <label className="flex items-center justify-between rounded-xl border border-orange-100/10 bg-[#0a0908] p-4"><span><span className="block text-sm font-medium text-stone-300">Color del fondo</span><span className="mt-1 block font-mono text-[10px] text-stone-600">{backgroundColor}</span></span><input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-orange-100/10 bg-transparent p-1" /></label>
                  <label className="flex items-center justify-between rounded-xl border border-orange-100/10 bg-[#0a0908] p-4"><span><span className="block text-sm font-medium text-stone-300">Color del círculo</span><span className="mt-1 block font-mono text-[10px] text-stone-600">{circleColor}</span></span><input type="color" value={circleColor} onChange={(event) => setCircleColor(event.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-orange-100/10 bg-transparent p-1" /></label>
                </div>
                <button onClick={() => generateCircle(false)} disabled={busy} className={`${buttonClass} mt-7`}><CircleDot className="size-4" /> Crear imagen BMP</button>
              </section>
              <section className="bg-[#0e0c09] p-6 sm:p-8"><div className="mb-6 flex items-center gap-2 text-sm font-semibold text-stone-300"><SlidersHorizontal className="size-4 text-orange-400" /> 2. Desplazamiento de color</div><ShiftControl shift={shift} onChange={setShift} /><button onClick={() => generateCircle(true)} disabled={busy} className={`${buttonClass} mt-7`}><Play className="size-4 fill-current" /> Crear y desplazar</button></section>
            </div>
            <div className="flex flex-col gap-3 border-t border-orange-100/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="font-mono text-[10px] uppercase tracking-wider text-stone-700">{filledPixelCount ? `${filledPixelCount.toLocaleString("es-MX")} píxeles forman el círculo relleno` : "Configura los valores y genera la imagen"}</p><button onClick={resetCircle} className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-orange-200"><RotateCcw className="size-4" /> Restablecer</button></div>
          </>
        ) : (
          <div className="grid gap-px bg-orange-100/10 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="bg-[#100d0a] p-6 sm:p-8"><div className="mb-6 flex items-center gap-2 text-sm font-semibold text-stone-300"><Upload className="size-4 text-orange-400" /> 1. Selecciona una imagen</div><label className="grid min-h-52 cursor-pointer place-items-center rounded-2xl border border-dashed border-orange-300/25 bg-[#0a0908] p-8 text-center transition hover:border-orange-300/60"><input type="file" accept="image/*" className="sr-only" onChange={(event) => void selectImage(event.target.files?.[0])} /><span className="text-center"><Upload className="mx-auto size-8 text-orange-400" /><span className="mt-4 block font-medium text-stone-200">{uploaded ? uploaded.filename : "Elegir imagen"}</span><span className="mt-2 block text-xs leading-5 text-stone-600">PNG, JPG, WebP, BMP u otro formato compatible · máximo 12 MB y 2048 × 2048 px</span>{uploaded ? <span className="mt-3 block font-mono text-[10px] text-orange-300">{uploaded.width} × {uploaded.height} px</span> : null}</span></label></section>
            <section className="bg-[#0e0c09] p-6 sm:p-8"><div className="mb-6 flex items-center gap-2 text-sm font-semibold text-stone-300"><SlidersHorizontal className="size-4 text-orange-400" /> 2. Desplaza sus píxeles</div><ShiftControl shift={shift} onChange={setShift} /><button onClick={processUploadedImage} disabled={busy || !uploaded} className={`${buttonClass} mt-7`}><Play className="size-4 fill-current" /> Aplicar a la imagen</button><p className="mt-4 text-xs leading-5 text-stone-600">Python modifica RGB píxel por píxel y conserva la transparencia.</p></section>
          </div>
        )}

        {error ? <div className="border-t border-red-300/15 bg-red-300/5 px-6 py-4"><p role="alert" className="text-sm text-red-300">{error}</p></div> : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2"><PreviewPanel eyebrow="BMP original" title="Círculo relleno" image={original} swatches={[backgroundColor, circleColor]} emptyText="Crea el BMP para mostrar aquí el círculo relleno." /><PreviewPanel eyebrow={`BMP resultado · +${shift}`} title="Círculo con desplazamiento" image={shifted} swatches={[shiftedBackground, shiftedCircle]} emptyText="Aplica un desplazamiento para comparar el resultado." /></div>
      {uploaded ? <div className="mt-6 grid gap-6 lg:grid-cols-2"><PreviewPanel eyebrow="Imagen cargada" title="Original" image={uploaded} emptyText="Selecciona una imagen." /><PreviewPanel eyebrow={`Resultado · +${shift} mod 256`} title="Píxeles desplazados" image={uploadedResult} emptyText="Aplica el desplazamiento para mostrar el resultado." /></div> : null}
    </>
  );
}
