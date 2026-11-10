import type { Category, IconName } from "./schema.ts";

export type Suggestion = { category: Category; icon: IconName };

/**
 * Keywords in a cost name, with the category and the icon that they suggest.
 * A keyword must be at the start or at the end of a word. German compounds put the main word at the end:
 * "Ökostrom" is "strom", "Kaltmiete" is "miete". But "Autobahnvignette" is not "bahn".
 * The first match wins. Thus specific words (for example "Kfz-Versicherung") come before general words ("Kfz").
 */
const RULES: readonly (Suggestion & { words: readonly string[] })[] = [
  {
    category: "insurance",
    icon: "heart-pulse",
    words: ["krankenkasse", "krankenversicherung", "zahnzusatz"],
  },
  {
    category: "insurance",
    icon: "shield",
    words: ["versicherung", "haftpflicht", "hausrat", "kasko", "rechtsschutz", "berufsunfähigkeit"],
  },
  { category: "housing", icon: "house", words: ["miete", "wohnung", "kredit haus", "hypothek"] },
  { category: "housing", icon: "building", words: ["nebenkosten", "hausgeld", "müll"] },
  { category: "housing", icon: "landmark", words: ["grundsteuer"] },
  { category: "energy", icon: "zap", words: ["strom"] },
  { category: "energy", icon: "flame", words: ["gas", "heizung", "fernwärme", "heizöl"] },
  { category: "energy", icon: "droplet", words: ["wasser"] },
  { category: "communication", icon: "radio", words: ["rundfunk", "gez"] },
  {
    category: "communication",
    icon: "wifi",
    words: ["internet", "dsl", "glasfaser", "wlan", "kabel"],
  },
  {
    category: "communication",
    icon: "smartphone",
    words: ["handy", "mobilfunk", "telefon", "smartphone"],
  },
  {
    category: "communication",
    icon: "tv",
    words: ["netflix", "disney", "prime", "streaming", "sky", "dazn", "youtube", "wow", "joyn"],
  },
  { category: "communication", icon: "music", words: ["spotify", "musik", "deezer", "tidal"] },
  { category: "communication", icon: "newspaper", words: ["zeitung", "zeitschrift", "magazin"] },
  { category: "communication", icon: "cloud", words: ["icloud", "cloud", "dropbox", "google one"] },
  {
    category: "communication",
    icon: "gamepad",
    words: ["playstation", "xbox", "nintendo", "gaming", "spiele"],
  },
  {
    category: "mobility",
    icon: "train",
    words: ["deutschlandticket", "bahn", "öpnv", "monatskarte", "ticket"],
  },
  { category: "mobility", icon: "fuel", words: ["tanken", "benzin", "diesel", "sprit"] },
  { category: "mobility", icon: "bike", words: ["fahrrad", "jobrad", "e-bike"] },
  {
    category: "mobility",
    icon: "car",
    words: ["auto", "kfz", "leasing", "carsharing", "parkplatz", "garage"],
  },
  {
    category: "health",
    icon: "dumbbell",
    words: ["fitness", "gym", "sport", "sportverein", "yoga"],
  },
  {
    category: "health",
    icon: "pill",
    words: ["apotheke", "medikament", "brille", "kontaktlinsen"],
  },
  { category: "savings", icon: "landmark", words: ["rente", "altersvorsorge", "riester", "rürup"] },
  { category: "savings", icon: "trending-up", words: ["etf", "depot", "aktien", "fonds"] },
  {
    category: "savings",
    icon: "piggy-bank",
    words: ["sparen", "sparplan", "tagesgeld", "bauspar", "rücklage"],
  },
  {
    category: "household",
    icon: "users",
    words: ["gemeinschaftskonto", "haushaltskasse", "gemeinsam"],
  },
  {
    category: "household",
    icon: "shopping-cart",
    words: ["lebensmittel", "einkauf", "supermarkt", "drogerie"],
  },
  {
    category: "household",
    icon: "baby",
    words: ["kita", "kindergarten", "kinder", "taschengeld", "hort"],
  },
  { category: "household", icon: "dog", words: ["hund", "tierarzt"] },
  { category: "household", icon: "cat", words: ["katze"] },
  {
    category: "other",
    icon: "graduation-cap",
    words: ["schule", "studium", "kurs", "universität", "nachhilfe"],
  },
  { category: "other", icon: "gift", words: ["spende", "patenschaft", "geschenk"] },
];

/** Suggests a category and an icon from the name of a cost. Returns `null` if no keyword matches. */
export function suggestFromName(name: string): Suggestion | null {
  const words = name.toLocaleLowerCase("de").split(/[^\p{L}\d]+/u);
  // Keywords with a space ("google one") are checked against the full name.
  const text = words.join(" ");
  const matches = (keyword: string) =>
    keyword.includes(" ")
      ? text.includes(keyword)
      : words.some((word) => word.startsWith(keyword) || word.endsWith(keyword));
  const rule = RULES.find((candidate) => candidate.words.some(matches));
  return rule ? { category: rule.category, icon: rule.icon } : null;
}
