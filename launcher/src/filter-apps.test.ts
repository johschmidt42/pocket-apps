import { testAppInfo } from "@pocket-apps/core/testing";
import { describe, expect, it } from "vitest";
import { filterApps } from "./filter-apps.ts";

const apps = [
  testAppInfo({ name: "zinsrechner", title: "Zinsrechner", description: "Zinseszins rechnen." }),
  testAppInfo({
    name: "app-ideen",
    title: "App-Ideen",
    description: "Ideen für neue Apps.",
  }),
];

describe("filterApps", () => {
  it("returns all apps for an empty query", () => {
    expect(filterApps(apps, "  ")).toEqual(apps);
  });

  it("finds apps by title, ignoring case", () => {
    expect(filterApps(apps, "ZINS").map((app) => app.name)).toEqual(["zinsrechner"]);
  });

  it("finds apps by description", () => {
    expect(filterApps(apps, "neue apps").map((app) => app.name)).toEqual(["app-ideen"]);
  });

  it("returns no apps when nothing matches", () => {
    expect(filterApps(apps, "Pflanzen")).toEqual([]);
  });
});
