import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./app.tsx";

describe("App", () => {
  it("starts with the start screen", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Neue Datei" })).toBeInTheDocument();
  });
});
