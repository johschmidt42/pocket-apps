import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mountApp } from "./mount-app.tsx";
import { applyTheme, saveTheme } from "./theme.ts";

function Hello() {
  return <p>Hallo</p>;
}

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  applyTheme("light");
});

describe("mountApp", () => {
  it("applies the saved theme and renders the app into #root", () => {
    document.body.innerHTML = '<div id="root"></div>';
    saveTheme("dark");

    act(() => {
      mountApp(Hello);
    });

    expect(screen.getByText("Hallo")).toBeInTheDocument();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("fails with a clear message without #root", () => {
    expect(() => {
      mountApp(Hello);
    }).toThrow("#root is missing");
  });
});
