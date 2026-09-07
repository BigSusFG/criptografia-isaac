import { SlidersHorizontal } from "lucide-react";

export type RgbShift = { r: number; g: number; b: number };
export const DEFAULT_RGB_SHIFT: RgbShift = { r: 40, g: 80, b: 120 };

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

export function RgbShiftControl({
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

export function AlphabetShiftControl({
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
