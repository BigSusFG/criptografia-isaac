import { LoaderCircle } from "lucide-react";

export type RuntimeState = "loading" | "ready" | "running" | "error";

export default function RuntimeStatus({
  status,
  runningLabel = "Procesando",
}: {
  status: RuntimeState;
  runningLabel?: string;
}) {
  const busy = status === "loading" || status === "running";
  const label =
    status === "ready"
      ? "Python listo"
      : status === "running"
        ? runningLabel
        : status === "error"
          ? "Error"
          : "Cargando Python";

  return (
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
      {label}
    </div>
  );
}
