import type { Line } from "./simulation.ts";

export type PaletteId =
  "glut" | "eis" | "aurora" | "feuer" | "zuckerwatte" | "sonne" | "mond" | "regenbogen";

/** Colors as hex numbers (sRGB). Each line gets one color between the first and the last stop. */
export type Palette = {
  id: PaletteId;
  name: string;
  stops: readonly [number, number, ...number[]];
};

const BY_ID: Readonly<Record<PaletteId, Palette>> = {
  glut: { id: "glut", name: "Glut", stops: [0xffc020, 0xff8a8c] },
  eis: { id: "eis", name: "Eis", stops: [0x5ec8ff, 0xb38cff] },
  aurora: { id: "aurora", name: "Aurora", stops: [0x4fe3c1, 0x9be15d] },
  feuer: { id: "feuer", name: "Feuer", stops: [0xff5e62, 0xff9966] },
  zuckerwatte: { id: "zuckerwatte", name: "Zuckerwatte", stops: [0xff7eb3, 0x7afcff] },
  sonne: { id: "sonne", name: "Sonne", stops: [0xf9d976, 0xf39f86] },
  mond: { id: "mond", name: "Mond", stops: [0xffffff, 0x8fa8ff] },
  regenbogen: {
    id: "regenbogen",
    name: "Regenbogen",
    stops: [0xff4d4d, 0xffb84d, 0xf5ff4d, 0x4dff88, 0x4dd2ff, 0x8f4dff, 0xff4dd2],
  },
};

/** All palettes, in the order of the color choice. */
export const PALETTES: readonly Palette[] = Object.values(BY_ID);

export function findPalette(id: PaletteId): Palette {
  return BY_ID[id];
}

export function isPaletteId(value: string): value is PaletteId {
  return PALETTES.some((palette) => palette.id === value);
}

/** The color at `t` (0 to 1) between the stops, as hex number. */
export function colorAt(stops: Palette["stops"], t: number): number {
  const scaled = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  let [from, to] = stops;
  let f = scaled;
  stops.forEach((stop, i) => {
    const next = stops[i + 1];
    if (next !== undefined && scaled >= i) {
      from = stop;
      to = next;
      f = scaled - i;
    }
  });
  const channel = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * f);
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** "#rrggbb", for SVG attributes. */
export function toCssHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

/** One sRGB channel (0 to 255) as a linear value (0 to 1). WebGL mixes light in linear values. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** The look of one line: its place in the palette (0 to 1) and its transparency. */
export type LineShade = { t: number; opacity: number };

export function createShades(count: number, random: () => number): LineShade[] {
  return Array.from({ length: count }, () => ({ t: random(), opacity: 0.3 + random() * 0.4 }));
}

/**
 * Writes the color of each point into `out` (red, green, blue, alpha; linear).
 * A line fades from its head to its end.
 */
export function fillLineColors(
  out: Float32Array,
  lines: readonly Pick<Line, "start" | "length">[],
  shades: readonly LineShade[],
  palette: Palette,
): void {
  lines.forEach(({ start, length }, h) => {
    const shade = shades[h] ?? { t: 0, opacity: 0.5 };
    const color = colorAt(palette.stops, shade.t);
    const r = toLinear((color >> 16) & 0xff);
    const g = toLinear((color >> 8) & 0xff);
    const b = toLinear(color & 0xff);
    for (let i = 0; i < length; i++) {
      const fade = (1 - i / (length - 1)) ** 0.7;
      const k = 4 * (start + i);
      out[k] = r * fade;
      out[k + 1] = g * fade;
      out[k + 2] = b * fade;
      out[k + 3] = shade.opacity;
    }
  });
}
