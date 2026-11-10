import { describe, expect, it } from "vitest";
import { suggestFromName } from "./suggest.ts";

describe("suggestFromName", () => {
  it.each([
    ["Miete", "housing", "house"],
    ["Stromabschlag", "energy", "zap"],
    ["Kfz-Versicherung", "insurance", "shield"],
    ["Techniker Krankenkasse", "insurance", "heart-pulse"],
    ["Netflix", "communication", "tv"],
    ["Deutschlandticket", "mobility", "train"],
    ["Gemeinschaftskonto", "household", "users"],
    ["ETF-Sparplan", "savings", "trending-up"],
    ["Ökostrom", "energy", "zap"],
    ["Kaltmiete", "housing", "house"],
    ["Autobahnvignette", "mobility", "car"],
    ["Google One", "communication", "cloud"],
  ])("suggests a category and an icon for %j", (name, category, icon) => {
    expect(suggestFromName(name)).toEqual({ category, icon });
  });

  it("returns null for an unknown name or a keyword in the middle of a word", () => {
    expect(suggestFromName("Xyz")).toBeNull();
    expect(suggestFromName("Förderkreis")).toBeNull();
    expect(suggestFromName("Kommunikationskurs")).toEqual({
      category: "other",
      icon: "graduation-cap",
    });
  });
});
