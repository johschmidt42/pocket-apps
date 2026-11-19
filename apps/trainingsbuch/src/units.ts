import { inchesText } from "./exercises.ts";
import type { UnitSystem } from "./schema.ts";

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

/**
 * The line with only one unit system. Metric: "9/6 kg". Imperial: "20/14 lb". A value
 * without a pair stays as it is. In a line about a box, a height in inches always shows in
 * inches, with the German word: "24/20 Zoll". Gyms give box heights in inches, also in countries
 * with kg. Other heights (for example of a pull-up bar) follow the unit system.
 */
export function showUnits(line: string, system: UnitSystem): string {
  const box = BOX_LINE.test(line);
  return line.replace(PAIR, (_match, metric: string, words: string, imperial: string) => {
    const inches = box ? INCHES.exec(imperial) : null;
    if (inches) return `${inchesText(inches[1] ?? "")}${words}`;
    return system === "metric" ? `${metric}${words}` : `${imperial}${words}`;
  });
}
