import { testAppInfo } from "@pocket-apps/core/testing";
import { describe, expect, it } from "vitest";
import { dropApp, moveApp, orderApps } from "./app-order.ts";

const apps = ["a", "b", "c", "d"].map((name) => testAppInfo({ name, title: name }));
const names = (list: readonly { name: string }[]) => list.map((app) => app.name);

describe("orderApps", () => {
  it("keeps the build order without a saved order", () => {
    expect(names(orderApps(apps, []))).toEqual(["a", "b", "c", "d"]);
  });

  it("puts the saved apps first and the others after them in build order", () => {
    expect(names(orderApps(apps, ["c", "a"]))).toEqual(["c", "a", "b", "d"]);
  });

  it("ignores names of apps that do not exist anymore", () => {
    expect(names(orderApps(apps, ["x", "d"]))).toEqual(["d", "a", "b", "c"]);
  });
});

describe("moveApp", () => {
  it("moves an app up or down", () => {
    expect(moveApp(apps, "c", -1)).toEqual(["a", "c", "b", "d"]);
    expect(moveApp(apps, "a", 1)).toEqual(["b", "a", "c", "d"]);
  });

  it("does nothing at the edges or for an unknown app", () => {
    expect(moveApp(apps, "a", -1)).toEqual(["a", "b", "c", "d"]);
    expect(moveApp(apps, "d", 1)).toEqual(["a", "b", "c", "d"]);
    expect(moveApp(apps, "x", -1)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("dropApp", () => {
  it("puts the app before or after another app", () => {
    expect(dropApp(apps, "d", "a", "before")).toEqual(["d", "a", "b", "c"]);
    expect(dropApp(apps, "a", "c", "after")).toEqual(["b", "c", "a", "d"]);
  });
});
