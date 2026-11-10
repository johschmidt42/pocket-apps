import { useId } from "react";
import { toCssHex, type Palette } from "./palettes.ts";

/** A small bar with the color gradient of a palette. */
export function PaletteSwatch({ palette }: { palette: Palette }) {
  const gradientId = useId();
  const last = palette.stops.length - 1;
  return (
    <svg viewBox="0 0 24 12" aria-hidden="true" className="h-3 w-6">
      <defs>
        <linearGradient id={gradientId}>
          {palette.stops.map((stop, i) => (
            <stop key={stop} offset={i / last} stopColor={toCssHex(stop)} />
          ))}
        </linearGradient>
      </defs>
      <rect width="24" height="12" rx="3" fill={`url(#${gradientId})`} />
    </svg>
  );
}
