import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { testAppInfo } from "../testing.ts";
import { AppHeader } from "./app-header.tsx";
import { applyTheme, readSavedTheme } from "./theme.ts";

afterEach(() => {
  localStorage.clear();
  applyTheme("light");
});

describe("AppHeader", () => {
  it("shows the title as the page heading and the version", () => {
    render(<AppHeader app={testAppInfo({ title: "Zinsrechner", version: "1.2" })} />);

    expect(screen.getByRole("heading", { level: 1, name: "Zinsrechner" })).toBeInTheDocument();
    // Visible: "1.2". Screen readers read: "Version 1.2".
    expect(screen.getByText("1.2")).toBeVisible();
    expect(screen.getByRole("banner")).toHaveTextContent("Version 1.2");
  });

  it("links back to the launcher", () => {
    render(<AppHeader app={testAppInfo()} />);

    expect(screen.getByRole("link", { name: "Alle Apps" })).toHaveAttribute("href", "./index.html");
  });

  it("has no back link when the config turns it off", () => {
    render(<AppHeader app={testAppInfo({ backLink: null })} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("switches between light and dark mode and saves the choice", async () => {
    const user = userEvent.setup();
    render(<AppHeader app={testAppInfo()} />);

    await user.click(screen.getByRole("button", { name: "Dunkles Design" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(readSavedTheme()).toBe("dark");

    await user.click(screen.getByRole("button", { name: "Helles Design" }));

    expect(document.documentElement).not.toHaveClass("dark");
    expect(readSavedTheme()).toBe("light");
  });

  it("starts with the theme that the page shows", () => {
    applyTheme("dark");

    render(<AppHeader app={testAppInfo()} />);

    expect(screen.getByRole("button", { name: "Helles Design" })).toBeInTheDocument();
  });
});
