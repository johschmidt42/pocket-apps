import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  currentTheme,
  initTheme,
  readSavedTheme,
  saveTheme,
  THEME_STORAGE_KEY,
} from "./theme.ts";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  applyTheme("light");
});

function breakStorage() {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("Storage is not available.", "SecurityError");
  });
}

describe("readSavedTheme", () => {
  it("is light when nothing is saved", () => {
    expect(readSavedTheme()).toBe("light");
  });

  it("returns the saved theme", () => {
    saveTheme("dark");

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readSavedTheme()).toBe("dark");
  });

  it("is light when the storage is not available", () => {
    breakStorage();

    expect(readSavedTheme()).toBe("light");
  });

  it("is light when reading fails", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(readSavedTheme()).toBe("light");
  });
});

describe("saveTheme", () => {
  it("does nothing when the storage is not available", () => {
    breakStorage();

    expect(() => {
      saveTheme("dark");
    }).not.toThrow();
  });

  it("does nothing when writing fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    expect(() => {
      saveTheme("dark");
    }).not.toThrow();
  });
});

describe("applyTheme and currentTheme", () => {
  it("sets and removes the dark class on <html>", () => {
    applyTheme("dark");

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(currentTheme()).toBe("dark");

    applyTheme("light");

    expect(document.documentElement).not.toHaveClass("dark");
    expect(currentTheme()).toBe("light");
  });
});

describe("initTheme", () => {
  it("applies the saved theme", () => {
    saveTheme("dark");

    initTheme();

    expect(currentTheme()).toBe("dark");
  });
});
