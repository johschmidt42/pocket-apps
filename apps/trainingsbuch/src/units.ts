import type { UnitSystem } from "./schema.ts";

/**
 * A metric value with its imperial value in parentheses, as in the texts of the built-in
 * workouts: "9/6 kg (20/14 lb)", "3/2.7 m (10/9 ft)" or "1600 m run (1 mile)". Words
 * between the two values ("run") belong to both.
 */
const PAIR = /([\d.,/]+ (?:kg|m|cm))((?: [a-z]+)*) \(([\d.,/]+ (?:lb|ft|in|pood|miles?))\)/g;

/**
 * The line with only one unit system. Metric: "9/6 kg". Imperial: "20/14 lb". A value
 * without a pair stays as it is.
 */
export function showUnits(line: string, system: UnitSystem): string {
  return line.replace(PAIR, (_match, metric: string, words: string, imperial: string) =>
    system === "metric" ? `${metric}${words}` : `${imperial}${words}`,
  );
}
