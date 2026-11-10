import { describe, expect, it } from "vitest";
import {
  activeProfile,
  addProfile,
  newId,
  removeActiveProfile,
  removeById,
  setActiveProfile,
  updateActiveProfile,
  upsert,
} from "./profiles.ts";
import type { FixkostenData } from "./schema.ts";
import { testProfile } from "./test-data.ts";

const data: FixkostenData = {
  profiles: [testProfile({ id: "a", name: "A" }), testProfile({ id: "b", name: "B" })],
  activeProfileId: "b",
};

describe("profiles", () => {
  it("finds the active profile, or the first profile for an unknown ID", () => {
    expect(activeProfile(data).name).toBe("B");
    expect(activeProfile({ ...data, activeProfileId: "x" }).name).toBe("A");
    expect(() => activeProfile({ profiles: [], activeProfileId: "x" })).toThrow("no profile");
  });

  it("adds a profile and makes it active", () => {
    const next = addProfile(data, "c", "C");

    expect(next.profiles.map((profile) => profile.name)).toEqual(["A", "B", "C"]);
    expect(next.activeProfileId).toBe("c");
  });

  it("activates only a profile that exists", () => {
    expect(setActiveProfile(data, "a").activeProfileId).toBe("a");
    expect(setActiveProfile(data, "x")).toBe(data);
  });

  it("changes only the active profile", () => {
    const next = updateActiveProfile(data, (profile) => ({ ...profile, name: "Neu" }));

    expect(next.profiles.map((profile) => profile.name)).toEqual(["A", "Neu"]);
  });

  it("removes the active profile but keeps the last one", () => {
    const next = removeActiveProfile(data);

    expect(next).toEqual({ profiles: [data.profiles[0]], activeProfileId: "a" });
    expect(removeActiveProfile(next)).toBe(next);
  });

  it("replaces or adds an item and removes an item by ID", () => {
    const list = [{ id: "1", value: 1 }];

    expect(upsert(list, { id: "1", value: 2 })).toEqual([{ id: "1", value: 2 }]);
    expect(upsert(list, { id: "2", value: 3 })).toEqual([...list, { id: "2", value: 3 }]);
    expect(removeById(list, "1")).toEqual([]);
  });

  it("makes new IDs", () => {
    expect(newId()).not.toBe(newId());
  });
});
