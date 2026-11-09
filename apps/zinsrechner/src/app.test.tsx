import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./app.tsx";

describe("Zinsrechner", () => {
  it("shows the result for the default values", () => {
    render(<App />);

    // The test config sets the title in __POCKET_APP__ to "Test-App".
    expect(screen.getByRole("heading", { level: 1, name: "Test-App" })).toBeInTheDocument();
    // 10.000 € at 3 % for 10 years.
    expect(screen.getByText(/^13\.439,16/)).toBeInTheDocument();
    expect(screen.getByText(/^3\.439,16/)).toBeInTheDocument();
  });

  it("updates the result when the user changes a value", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("Laufzeit (Jahre)"));
    await user.type(screen.getByLabelText("Laufzeit (Jahre)"), "1");
    await user.clear(screen.getByLabelText("Zinssatz pro Jahr (%)"));
    await user.type(screen.getByLabelText("Zinssatz pro Jahr (%)"), "10");
    await user.clear(screen.getByLabelText("Startkapital (€)"));
    await user.type(screen.getByLabelText("Startkapital (€)"), "100");

    expect(screen.getByText(/110,00/)).toBeInTheDocument();
  });

  it("asks for valid numbers when an input is invalid", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("Startkapital (€)"));

    expect(screen.getByText("Bitte gib gültige Zahlen ein.")).toBeInTheDocument();
  });
});
