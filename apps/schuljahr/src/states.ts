import { z } from "zod";

/** The 16 German states with their ISO 3166-2 codes. OpenHolidays uses these codes. */
export const STATES = [
  { code: "DE-BW", name: "Baden-Württemberg" },
  { code: "DE-BY", name: "Bayern" },
  { code: "DE-BE", name: "Berlin" },
  { code: "DE-BB", name: "Brandenburg" },
  { code: "DE-HB", name: "Bremen" },
  { code: "DE-HH", name: "Hamburg" },
  { code: "DE-HE", name: "Hessen" },
  { code: "DE-MV", name: "Mecklenburg-Vorpommern" },
  { code: "DE-NI", name: "Niedersachsen" },
  { code: "DE-NW", name: "Nordrhein-Westfalen" },
  { code: "DE-RP", name: "Rheinland-Pfalz" },
  { code: "DE-SL", name: "Saarland" },
  { code: "DE-SN", name: "Sachsen" },
  { code: "DE-ST", name: "Sachsen-Anhalt" },
  { code: "DE-SH", name: "Schleswig-Holstein" },
  { code: "DE-TH", name: "Thüringen" },
] as const;

export const stateCodeSchema = z.enum(STATES.map((state) => state.code));

export type StateCode = z.infer<typeof stateCodeSchema>;

export function isStateCode(value: string): value is StateCode {
  return stateCodeSchema.safeParse(value).success;
}

export function stateName(code: StateCode): string {
  return STATES.find((state) => state.code === code)?.name ?? code;
}
