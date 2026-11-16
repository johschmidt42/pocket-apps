import type { Language } from "../schema.ts";

/** The fixed words of the CV designs. The language of a variant selects them. */
export type CvLabels = {
  description: string;
  tasks: string;
  tools: string;
  /** Before the start of a station without an end: "Since 01/2024". */
  since: string;
};

export const CV_LABELS: Record<Language, CvLabels> = {
  de: { description: "Beschreibung", tasks: "Aufgaben", tools: "Tools", since: "Seit" },
  en: { description: "Description", tasks: "Tasks", tools: "Tools", since: "Since" },
};

/** The German name of each language, for the editor. */
export const LANGUAGE_LABELS: Record<Language, string> = { de: "Deutsch", en: "Englisch" };
