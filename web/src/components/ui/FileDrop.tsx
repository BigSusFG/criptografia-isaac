import { Upload } from "lucide-react";

export default function FileDrop({
  accept,
  emptyLabel,
  filename,
  hint,
  metadata,
  onFile,
}: {
  accept: string;
  emptyLabel: string;
  filename: string | null;
  hint: string;
  metadata?: string;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <label className="grid min-h-44 cursor-pointer place-items-center rounded-2xl border border-dashed border-orange-300/25 bg-[#0a0908] p-7 text-center transition hover:border-orange-300/60">
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
      <span>
        <Upload className="mx-auto size-8 text-orange-400" />
        <span className="mt-4 block font-medium text-stone-200">
          {filename ?? emptyLabel}
        </span>
        <span className="mt-2 block text-xs leading-5 text-stone-600">{hint}</span>
        {metadata ? (
          <span className="mt-3 block font-mono text-[10px] text-orange-300">
            {metadata}
          </span>
        ) : null}
      </span>
    </label>
  );
}
