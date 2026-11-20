import { inchesText } from "./exercises.ts";
import type { LoadsFor, UnitSystem } from "./schema.ts";

/**
 * A metric value with its imperial value in parentheses, as in the texts of the built-in
 * workouts: "9/6 kg (20/14 lb)", "3/2.7 m (10/9 ft)" or "1600 m run (1 mile)". Words
 * between the two values ("run") belong to both.
 */
const PAIR = /([\d.,/]+ (?:kg|m|cm))((?: [a-z]+)*) \(([\d.,/]+ (?:lb|ft|in|pood|miles?))\)/g;

/** An imperial value in inches: "24/20 in". */
const INCHES = /^([\d.,/]+) in$/;

/** A line about a box: box jumps, box step-overs or step-ups. */
const BOX_LINE = /\bbox|\bstep-ups?\b/i;

/** How the texts of the built-in workouts show loads, heights and distances. */
export type TextDisplay = { units: UnitSystem; loadsFor: LoadsFor };

/** A pair of values with a unit: "43/29 kg", "24/20 Zoll". The first is for men. */
const MEN_WOMEN = /(\d[\d.,]*)\/(\d[\d.,]*)( (?:kg|lb|cm|in|m|ft|pood|miles?|Zoll)\b)/g;

/** True if the line has a value for men and one for women, for example "43/29 kg". */
export function hasMenWomen(line: string): boolean {
  return new RegExp(MEN_WOMEN.source).test(line);
}

/**
 * A line of a workout as the user wants to see it:
 * - One unit system. Metric: "9/6 kg". Imperial: "20/14 lb". A value without a pair stays.
 * - In a line about a box, a height in inches always shows in inches, with the German word:
 *   "24/20 Zoll". Gyms give box heights in inches, also in countries with kg. Other heights (for
 *   example of a pull-up bar) follow the unit system.
 * - Only the value for men or for women: "43 kg" or "29 kg". A fraction such as
 *   "3/4 body weight" has no unit and stays.
 */
export function showLine(line: string, { units, loadsFor }: TextDisplay): string {
  const box = BOX_LINE.test(line);
  const oneSystem = line.replace(
    PAIR,
    (_match, metric: string, words: string, imperial: string) => {
      const inches = box ? INCHES.exec(imperial) : null;
      if (inches) return `${inchesText(inches[1] ?? "")}${words}`;
      return units === "metric" ? `${metric}${words}` : `${imperial}${words}`;
    },
  );
  return oneSystem.replace(MEN_WOMEN, (_match, men: string, women: string, unit: string) =>
    loadsFor === "men" ? `${men}${unit}` : `${women}${unit}`,
  );
}
