import { testAppInfo } from "@pocket-apps/core/testing";
import { describe, expect, it } from "vitest";
import { splitFavorites, toggleFavorite } from "./favorites.ts";

const apps = ["a", "b", "c"].map((name) => testAppInfo({ name, title: name }));
const names = (list: readonly { name: string }[]) => list.map((app) => app.name);

describe("toggleFavorite", () => {
  it("adds an app that is not a favorite", () => {
    expect(toggleFavorite(["a"], "c")).toEqual(["a", "c"]);
  });

  it("removes an app that is a favorite", () => {
    expect(toggleFavorite(["a", "c"], "a")).toEqual(["c"]);
  });
});

describe("splitFavorites", () => {
  it("keeps the order of the apps in both lists", () => {
    const { favorites, others } = splitFavorites(apps, ["c", "a"]);

    expect(names(favorites)).toEqual(["a", "c"]);
    expect(names(others)).toEqual(["b"]);
  });

  it("ignores names of apps that do not exist anymore", () => {
    const { favorites, others } = splitFavorites(apps, ["x"]);

    expect(favorites).toEqual([]);
    expect(names(others)).toEqual(["a", "b", "c"]);
  });
});
