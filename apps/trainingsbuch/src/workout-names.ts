// Random names for own workouts, in the style of gym workout names ("Iron Badger").
// English, like the names of the built-in workouts.

const ADJECTIVES = [
  "Iron",
  "Silent",
  "Burning",
  "Wild",
  "Rusty",
  "Steel",
  "Thunder",
  "Savage",
  "Frozen",
  "Golden",
  "Angry",
  "Midnight",
  "Heavy",
  "Restless",
  "Brave",
  "Crimson",
  "Electric",
  "Stubborn",
  "Hungry",
  "Raging",
  "Lonely",
  "Mighty",
  "Grim",
  "Swift",
] as const;

const NOUNS = [
  "Badger",
  "Storm",
  "Anvil",
  "Lungs",
  "Grizzly",
  "Hammer",
  "Viking",
  "Avalanche",
  "Wolf",
  "Engine",
  "Mountain",
  "Rhino",
  "Furnace",
  "Bison",
  "Comet",
  "Kraken",
  "Volcano",
  "Gorilla",
  "Tornado",
  "Spartan",
  "Moose",
  "Phoenix",
  "Boulder",
  "Falcon",
] as const;

/** A number from 0 (inclusive) to 1 (exclusive), like `Math.random()`. */
export type Random = () => number;

function pick(list: readonly string[], random: Random): string {
  // The index is always in the list. `?? ""` only satisfies the type check.
  return list[Math.floor(random() * list.length)] ?? "";
}

/**
 * A random name such as "Iron Badger". It is not one of the `taken` names (case does not
 * matter). After 50 tries without a free name, it adds a number: "Iron Badger 2".
 */
export function randomWorkoutName(taken: readonly string[], random: Random = Math.random): string {
  const used = new Set(taken.map((name) => name.toLocaleLowerCase("de")));
  let name = "";
  for (let attempt = 0; attempt < 50; attempt++) {
    name = `${pick(ADJECTIVES, random)} ${pick(NOUNS, random)}`;
    if (!used.has(name.toLocaleLowerCase("de"))) return name;
  }
  let number = 2;
  while (used.has(`${name} ${String(number)}`.toLocaleLowerCase("de"))) number++;
  return `${name} ${String(number)}`;
}
