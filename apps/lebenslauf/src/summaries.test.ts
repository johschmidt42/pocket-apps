import { describe, expect, it } from "vitest";
import { exampleSections } from "./example.ts";
import { entrySummaries } from "./summaries.ts";

describe("entrySummaries", () => {
  it("gives a title and a detail for each kind of entry", () => {
    let next = 0;
    const [projects, work, , skills] = exampleSections(() => String(++next));

    expect(entrySummaries(projects!)[0]).toMatchObject({
      title: "Order Analytics Platform",
      detail: "Python, FastAPI, PostgreSQL, Docker, GitHub Actions",
    });
    expect(entrySummaries(work!).map((entry) => entry.detail)).toEqual([
      "seit 01/2024",
      "03/2021 – 12/2023",
    ]);
    expect(entrySummaries(skills!)[0]).toMatchObject({
      title: "Languages",
      detail: "German (native), English (fluent)",
    });
  });
});
