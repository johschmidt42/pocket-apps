import { describe, expect, it } from "vitest";
import { exampleSections } from "./example.ts";
import { entrySummaries } from "./summaries.ts";

describe("entrySummaries", () => {
  it("gives a title and a detail for each kind of entry", () => {
    let next = 0;
    const [projects, work, , skills] = exampleSections(() => String(++next));

    expect(entrySummaries(projects!)[0]).toMatchObject({
      title: "Order Analytics Platform",
      detail: "seit 03/2024 · Python, FastAPI, PostgreSQL, Docker, GitHub Actions",
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

  it("leaves out the time range and the tools of a project that has none", () => {
    const project = {
      id: "p",
      title: "Shop",
      role: "",
      client: "",
      from: null,
      to: null,
      description: "",
      tasks: [],
      tools: [],
    };
    const section = { id: "s", title: "Projects", kind: "projects" as const, entries: [project] };

    expect(entrySummaries(section)[0]?.detail).toBe("");
    expect(
      entrySummaries({ ...section, entries: [{ ...project, from: "2023-01", to: "2023-12" }] })[0]
        ?.detail,
    ).toBe("01/2023 – 12/2023");
  });
});
