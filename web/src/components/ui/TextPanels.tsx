export type CipherMetrics = {
  desplazamiento_efectivo: number;
  letras_transformadas: number;
  caracteres_totales: number;
};

export const textPreviewClass =
  "min-h-64 w-full resize-y rounded-xl border border-orange-100/10 bg-[#0a0908] px-4 py-3 font-mono text-sm leading-6 text-stone-300 outline-none";

export function TextPreview({
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
        className={`${textPreviewClass} mt-3 ${highlight ? "text-orange-100" : ""}`}
      />
    </label>
  );
}

export function Metrics({ value }: { value: CipherMetrics | null }) {
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
