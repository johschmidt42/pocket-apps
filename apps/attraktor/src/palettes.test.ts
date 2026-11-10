import { describe, expect, it } from "vitest";
import {
  colorAt,
  createShades,
  fillLineColors,
  findPalette,
  isPaletteId,
  PALETTES,
  toCssHex,
} from "./palettes.ts";
import { seededRandom } from "./seeded-random.ts";

describe("PALETTES", () => {
  it("has eight palettes with different ids", () => {
    expect(new Set(PALETTES.map((palette) => palette.id)).size).toBe(8);
  });

  it("finds a palette by id", () => {
    expect(findPalette("eis").name).toBe("Eis");
  });

  it("knows the palette ids", () => {
    expect(isPaletteId("regenbogen")).toBe(true);
    expect(isPaletteId("lila")).toBe(false);
  });
});

describe("colorAt", () => {
  it("gives the stops at the ends and mixes between them", () => {
    const stops = [0x000000, 0xff8000] as const;
    expect(colorAt(stops, 0)).toBe(0x000000);
    expect(colorAt(stops, 1)).toBe(0xff8000);
    expect(colorAt(stops, 0.5)).toBe(0x804000);
  });

  it("uses the right pair of stops with more than two stops", () => {
    const stops = [0xff0000, 0x00ff00, 0x0000ff] as const;
    expect(colorAt(stops, 0.5)).toBe(0x00ff00);
    expect(colorAt(stops, 0.75)).toBe(0x008080);
  });

  it("keeps t between 0 and 1", () => {
    const stops = [0x000000, 0xffffff] as const;
    expect(colorAt(stops, -1)).toBe(0x000000);
    expect(colorAt(stops, 2)).toBe(0xffffff);
  });
});

describe("toCssHex", () => {
  it("writes six hex digits", () => {
    expect(toCssHex(0x00ff8c)).toBe("#00ff8c");
  });
});

describe("createShades", () => {
  it("gives each line a place in the palette and a transparency", () => {
    const shades = createShades(50, seededRandom(3));
    expect(shades).toHaveLength(50);
    for (const { t, opacity } of shades) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(1);
      expect(opacity).toBeGreaterThanOrEqual(0.3);
      expect(opacity).toBeLessThan(0.7);
    }
  });
});

describe("fillLineColors", () => {
  it("fades each line from its head to its end", () => {
    const lines = [
      { start: 0, length: 3 },
      { start: 3, length: 2 },
    ];
    const out = new Float32Array(4 * 5);
    const white = { id: "mond", name: "Weiß", stops: [0xffffff, 0xffffff] } as const;
    fillLineColors(out, lines, [{ t: 0, opacity: 0.4 }], white);

    // Head of line 1: full white, its own transparency.
    expect(Array.from(out.slice(0, 4))).toEqual([1, 1, 1, expect.closeTo(0.4)]);
    // End of line 1: black (no light).
    expect(Array.from(out.slice(8, 11))).toEqual([0, 0, 0]);
    // Line 2 has no shade: it uses the middle transparency.
    expect(out[15]).toBeCloseTo(0.5);
  });

  it("writes linear colors", () => {
    const out = new Float32Array(8);
    const gray = { id: "mond", name: "Grau", stops: [0x808080, 0x808080] } as const;
    fillLineColors(out, [{ start: 0, length: 2 }], [{ t: 0, opacity: 1 }], gray);
    // sRGB 128 is about 0.216 in linear light.
    expect(out[0]).toBeCloseTo(0.216, 3);
  });

  it("keeps dark channels linear without the power curve", () => {
    const out = new Float32Array(8);
    const dark = { id: "mond", name: "Dunkel", stops: [0x050505, 0x050505] } as const;
    fillLineColors(out, [{ start: 0, length: 2 }], [{ t: 0, opacity: 1 }], dark);
    expect(out[0]).toBeCloseTo(5 / 255 / 12.92, 6);
  });
});
