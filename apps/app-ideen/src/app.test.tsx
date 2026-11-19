import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./app.tsx";

describe("App", () => {
  it("shows the title and asks where the data lives", async () => {
    render(<App />);

    // jsdom has no File System Access API, so only OneDrive is offered.
    expect(screen.getByRole("heading", { level: 1, name: "Test-App" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Wo sollen deine Daten liegen?" }),
    ).toBeInTheDocument();
  });
});
