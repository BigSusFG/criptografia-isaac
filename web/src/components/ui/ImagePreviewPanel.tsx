import { Download, ImageIcon } from "lucide-react";

export type GeneratedImage = { url: string; filename: string };

export default function ImagePreviewPanel({
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
