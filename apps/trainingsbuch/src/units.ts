import type { UnitSystem } from "./schema.ts";

/**
 * A metric value with its imperial value in parentheses, as in the texts of the built-in
 * workouts: "9/6 kg (20/14 lb)", "3/2.7 m (10/9 ft)" or "1600 m run (1 mile)". Words
 * between the two values ("run") belong to both.
 */
const PAIR = /([\d.,/]+ (?:kg|m|cm))((?: [a-z]+)*) \(([\d.,/]+ (?:lb|ft|in|pood|miles?))\)/g;

/** An imperial value in inches: "24/20 in". */
const INCHES = /^([\d.,/]+) in$/;

/**
 * The line with only one unit system. Metric: "9/6 kg". Imperial: "20/14 lb". A value
 * without a pair stays as it is. A height in inches (a box) always shows in inches, with the
 * German word: "24/20 Zoll". Gyms give box heights in inches, also in countries with kg.
 */
export function showUnits(line: string, system: UnitSystem): string {
  return line.replace(PAIR, (_match, metric: string, words: string, imperial: string) => {
    const inches = INCHES.exec(imperial);
    if (inches) return `${inches[1] ?? ""} Zoll${words}`;
    return system === "metric" ? `${metric}${words}` : `${imperial}${words}`;
  });
}
