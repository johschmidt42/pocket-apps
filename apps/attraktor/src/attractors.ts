import type { PaletteId } from "./palettes.ts";

/** A point or a direction in 3D. */
export type Vec3 = readonly [number, number, number];

/** A mutable 3D value. The hot loops write into it to avoid new arrays. */
export type MutableVec3 = { x: number; y: number; z: number };

/** Each attractor uses some of these six parameter slots. Unused slots are 0. */
export type ParamKey = "a" | "b" | "c" | "d" | "e" | "f";
export type Params = Readonly<Record<ParamKey, number>>;

/** A parameter that the app shows, with its math symbol. */
export type ParamSymbol = { key: ParamKey; symbol: string; meaning: string };

export type AttractorId = "aizawa" | "lorenz" | "thomas" | "halvorsen" | "roessler" | "dadras";

export type Attractor = {
  id: AttractorId;
  /** German display name. */
  name: string;
  /** German short text for the gallery. */
  description: string;
  /** German text for the explanation: who found the attractor and how the points move. */
  about: string;
  /** The three formulas, as text. They give the velocity of a point at (x, y, z). */
  equations: readonly [string, string, string];
  /** The parameters that the app shows, with their math symbols. */
  symbols: readonly ParamSymbol[];
  /** The first profile is the start. The parameters drift slowly between the profiles. */
  profiles: readonly [Params, ...Params[]];
  /** The velocity at (x, y, z) in the coordinates of the formula. */
  derivative: (x: number, y: number, z: number, p: Params, out: MutableVec3) => void;
  /** Time per step. With these values, all attractors move at about the same speed on screen. */
  dt: number;
  /** A start point near the attractor, in the coordinates of the formula. */
  seed: Vec3;
  /** world = (formula point − center) × scale. Then each attractor is about 2.3 units in radius. */
  center: Vec3;
  scale: number;
  camera: { position: Vec3; target: Vec3; up: Vec3 };
  /** The colors at the start. The user can choose other colors. */
  palette: PaletteId;
};

const ZERO: Params = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 };

// Aizawa, with the values and the profiles of zensical.org.
// zensical.org divides ε by 4 in the formula. We do the same, so that the shape is the same.
const aizawa: Attractor = {
  id: "aizawa",
  name: "Aizawa",
  description: "Eine leuchtende Kugel mit einer Achse. Wie auf zensical.org.",
  about:
    "Benannt nach dem Physiker Yoji Aizawa. Die Punkte drehen sich um eine senkrechte Achse. Oben laufen sie nach außen, außen fallen sie nach unten. Unten laufen sie wieder nach innen und steigen entlang der Achse auf. Die Parameter ändern sich langsam, alle 3 bis 6 Minuten zu neuen Werten, wie auf zensical.org.",
  equations: [
    "dx/dt = (z − β)·x − δ·y",
    "dy/dt = δ·x + (z − β)·y",
    "dz/dt = γ + α·z − z³/3 − (x² + y²)·(1 + ε/4·z) + ζ·z·x³",
  ],
  symbols: [
    { key: "a", symbol: "α", meaning: "Wie stark die Höhe z sich selbst verstärkt." },
    {
      key: "b",
      symbol: "β",
      meaning: "Die Höhe, ab der die Bahnen nach außen laufen. Darunter laufen sie nach innen.",
    },
    { key: "c", symbol: "γ", meaning: "Ein gleichmäßiger Schub nach oben." },
    { key: "d", symbol: "δ", meaning: "Die Drehgeschwindigkeit um die Achse." },
    {
      key: "e",
      symbol: "ε",
      meaning: "Wie stark die Höhe den Zug nach unten verändert, der außen wirkt.",
    },
    {
      key: "f",
      symbol: "ζ",
      meaning: "Ein kleiner Zusatz. Er bricht die Symmetrie und macht die Form schief.",
    },
  ],
  profiles: [
    { a: 0.95, b: 0.2, c: 0.7, d: 3.5, e: 0.25, f: 0.1 },
    { a: 0.945, b: 0.22, c: 0.71, d: 3.55, e: 0.35, f: 0.1 },
    { a: 0.945, b: 0.241, c: 0.71, d: 3.578, e: 0.457, f: 0.152 },
    { a: 0.944, b: 0.238, c: 0.71, d: 3.573, e: 0.433, f: 0.164 },
    { a: 0.935, b: 0.18, c: 0.72, d: 3.52, e: 0.3, f: 0.12 },
  ],
  derivative: (x, y, z, p, out) => {
    out.x = (z - p.b) * x - p.d * y;
    out.y = p.d * x + (z - p.b) * y;
    out.z = p.c + p.a * z - z ** 3 / 3 - (x * x + y * y) * (1 + (p.e / 4) * z) + p.f * z * x ** 3;
  },
  dt: 0.0125,
  seed: [0.1, 0, 0],
  center: [0, 0, 0],
  scale: 1,
  camera: { position: [-1.607, 1.473, -2.63], target: [0.141, -0.1, 0.85], up: [0, 1, 0] },
  palette: "glut",
};

const lorenz: Attractor = {
  id: "lorenz",
  name: "Lorenz",
  description: "Der Schmetterling der Chaosforschung. Zwei Flügel, die Bahn springt hin und her.",
  about:
    "Der Meteorologe Edward Lorenz fand diese Formeln 1963 in einem einfachen Wettermodell: Luft, die von unten warm wird. Die Bahn kreist um zwei Punkte und springt unvorhersehbar zwischen den Flügeln. Daher kommt das Wort „Schmetterlingseffekt“.",
  equations: ["dx/dt = σ·(y − x)", "dy/dt = x·(ρ − z) − y", "dz/dt = x·y − β·z"],
  symbols: [
    { key: "a", symbol: "σ", meaning: "Wie schnell x dem Wert y folgt." },
    {
      key: "b",
      symbol: "ρ",
      meaning: "Der Antrieb: wie stark die Luft von unten warm wird. Ab etwa 24,7 gibt es Chaos.",
    },
    { key: "c", symbol: "β", meaning: "Wie schnell z von selbst kleiner wird." },
  ],
  profiles: [{ ...ZERO, a: 10, b: 28, c: 8 / 3 }],
  derivative: (x, y, z, p, out) => {
    out.x = p.a * (y - x);
    out.y = x * (p.b - z) - y;
    out.z = x * y - p.c * z;
  },
  dt: 0.002,
  // A point on the wings. From (1, 1, 1), the path circles a fixed point for a long time first.
  seed: [11.1, 10.3, 31.2],
  center: [0, 0, 25],
  scale: 0.09,
  camera: { position: [0.8, -4.2, 0.4], target: [0, 0, 0], up: [0, 0, 1] },
  palette: "eis",
};

const thomas: Attractor = {
  id: "thomas",
  name: "Thomas",
  description: "Ein Labyrinth mit dreifacher Symmetrie. Die Bahnen wandern durch Zellen.",
  about:
    "Der Biologe René Thomas beschrieb dieses System 1999. Die drei Formeln sind gleich gebaut: x, y und z tauschen nur die Plätze. Daher kommt die dreifache Symmetrie.",
  equations: ["dx/dt = sin(y) − b·x", "dy/dt = sin(z) − b·y", "dz/dt = sin(x) − b·z"],
  symbols: [
    {
      key: "a",
      symbol: "b",
      meaning:
        "Die Reibung. Mit großem b kommen die Punkte zur Ruhe. Unter etwa 0,208 wird die Bewegung chaotisch.",
    },
  ],
  profiles: [{ ...ZERO, a: 0.208186 }],
  derivative: (x, y, z, p, out) => {
    out.x = Math.sin(y) - p.a * x;
    out.y = Math.sin(z) - p.a * y;
    out.z = Math.sin(x) - p.a * z;
  },
  dt: 0.03,
  seed: [0.1, 0, 0],
  center: [0, 0, 0],
  scale: 0.6,
  camera: { position: [2.6, 2.6, 2.6], target: [0, 0, 0], up: [0, 0, 1] },
  palette: "aurora",
};

const halvorsen: Attractor = {
  id: "halvorsen",
  name: "Halvorsen",
  description: "Drei Schleifen um eine Achse. Wie ein Propeller.",
  about:
    "Benannt nach Arne Dag Halvorsen. Wie bei Thomas tauschen x, y und z reihum die Plätze. Daraus entstehen drei gleiche Schleifen um eine Achse.",
  equations: [
    "dx/dt = −a·x − 4·y − 4·z − y²",
    "dy/dt = −a·y − 4·z − 4·x − z²",
    "dz/dt = −a·z − 4·x − 4·y − x²",
  ],
  symbols: [
    { key: "a", symbol: "a", meaning: "Die Dämpfung: wie stark jede Größe sich selbst bremst." },
  ],
  profiles: [{ ...ZERO, a: 1.89 }],
  derivative: (x, y, z, p, out) => {
    out.x = -p.a * x - 4 * y - 4 * z - y * y;
    out.y = -p.a * y - 4 * z - 4 * x - z * z;
    out.z = -p.a * z - 4 * x - 4 * y - x * x;
  },
  dt: 0.0015,
  seed: [-1.48, -1.51, 2.04],
  center: [-3.22, -3.22, -3.22],
  scale: 0.24,
  camera: { position: [2.6, 2.6, 2.6], target: [0, 0, 0], up: [0, 0, 1] },
  palette: "feuer",
};

const roessler: Attractor = {
  id: "roessler",
  name: "Rössler",
  description: "Eine flache Spirale. Ab und zu springt eine Bahn steil nach oben.",
  about:
    "Der Biochemiker Otto Rössler fand dieses System 1976. Er suchte die einfachste Form von Chaos: Nur ein Term (z·x) ist nicht linear.",
  equations: ["dx/dt = −y − z", "dy/dt = x + a·y", "dz/dt = b + z·(x − c)"],
  symbols: [
    { key: "a", symbol: "a", meaning: "Wie schnell die flache Spirale nach außen wächst." },
    { key: "b", symbol: "b", meaning: "Ein kleiner, fester Schub für z." },
    {
      key: "c",
      symbol: "c",
      meaning:
        "Die Schwelle. Wenn x größer als c wird, springt z steil nach oben. Dann fällt die Bahn zurück in die Mitte.",
    },
  ],
  profiles: [{ ...ZERO, a: 0.2, b: 0.2, c: 5.7 }],
  derivative: (x, y, z, p, out) => {
    out.x = -y - z;
    out.y = x + p.a * y;
    out.z = p.b + z * (x - p.c);
  },
  dt: 0.0085,
  seed: [1, 1, 0],
  center: [0, 0, 8],
  scale: 0.12,
  camera: { position: [0.6, -2.8, 1.4], target: [0.2, 0, 0.2], up: [0, 0, 1] },
  palette: "zuckerwatte",
};

const dadras: Attractor = {
  id: "dadras",
  name: "Dadras",
  description: "Zwei verdrehte Flügel. Die Bahnen wechseln zwischen ihnen hin und her.",
  about:
    "Sara Dadras und Hamid Reza Momeni beschrieben dieses System 2009. Mit anderen Parametern hat es zwei, drei oder vier Flügel. Diese Werte geben zwei Flügel.",
  equations: ["dx/dt = y − a·x + b·y·z", "dy/dt = c·y − x·z + z", "dz/dt = d·x·y − e·z"],
  symbols: [
    { key: "a", symbol: "a", meaning: "Wie stark x sich selbst bremst." },
    { key: "b", symbol: "b", meaning: "Wie stark y und z zusammen auf x wirken." },
    { key: "c", symbol: "c", meaning: "Wie stark y sich selbst verstärkt." },
    { key: "d", symbol: "d", meaning: "Wie stark x und y zusammen auf z wirken." },
    { key: "e", symbol: "e", meaning: "Wie stark z sich selbst bremst." },
  ],
  profiles: [{ ...ZERO, a: 3, b: 2.7, c: 1.7, d: 2, e: 9 }],
  derivative: (x, y, z, p, out) => {
    out.x = y - p.a * x + p.b * y * z;
    out.y = p.c * y - x * z + z;
    out.z = p.d * x * y - p.e * z;
  },
  dt: 0.0095,
  seed: [1, 1, 0],
  center: [0.78, -1.2, -0.85],
  scale: 0.113,
  camera: { position: [2.6, -2.6, 2], target: [0, 0, 0], up: [0, 0, 1] },
  palette: "sonne",
};

/** All attractors, in the order of the gallery. */
export const ATTRACTORS: readonly Attractor[] = [
  aizawa,
  lorenz,
  thomas,
  halvorsen,
  roessler,
  dadras,
];
