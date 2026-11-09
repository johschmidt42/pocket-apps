import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./app.tsx";

describe("App", () => {
  it("shows the title and needs Chrome or Edge for the data folder", () => {
    render(<App />);

    // jsdom has no File System Access API.
    expect(screen.getByRole("heading", { level: 1, name: "Test-App" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Bitte Chrome oder Edge verwenden" }),
    ).toBeInTheDocument();
  });
});
