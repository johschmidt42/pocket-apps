import { testAppInfo } from "@pocket-apps/core/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./app.tsx";

const apps = [
  testAppInfo({ name: "zinsrechner", title: "Zinsrechner", version: "1.2", stateful: false }),
  testAppInfo({ name: "einkaufsliste", title: "Einkaufsliste", stateful: true, network: true }),
];

describe("Launcher", () => {
  it("shows a card with a link for every app", () => {
    render(<App apps={apps} />);

    expect(screen.getByRole("link", { name: "Zinsrechner" })).toHaveAttribute(
      "href",
      "./zinsrechner.html",
    );
    expect(screen.getByRole("link", { name: "Einkaufsliste" })).toHaveAttribute(
      "href",
      "./einkaufsliste.html",
    );
    const zins = screen.getByRole("link", { name: "Zinsrechner" });
    expect(zins).toHaveTextContent("Version 1.2");
    expect(within(zins).getByRole("img", { name: "Speichert keine Daten" })).toBeInTheDocument();
    expect(
      within(zins).getByRole("img", { name: "Funktioniert ohne Internet" }),
    ).toBeInTheDocument();
    const liste = screen.getByRole("link", { name: "Einkaufsliste" });
    expect(
      within(liste).getByRole("img", { name: "Speichert Daten in einer eigenen Datei" }),
    ).toBeInTheDocument();
    expect(within(liste).getByRole("img", { name: "Braucht Internet" })).toBeInTheDocument();
  });

  it("filters the apps by the search text", async () => {
    const user = userEvent.setup();
    render(<App apps={apps} />);

    await user.type(screen.getByLabelText("Apps durchsuchen"), "einkauf");

    expect(screen.getByRole("link", { name: "Einkaufsliste" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Zinsrechner" })).not.toBeInTheDocument();
  });

  it("says so when no app matches", async () => {
    const user = userEvent.setup();
    render(<App apps={apps} />);

    await user.type(screen.getByLabelText("Apps durchsuchen"), "xyz");

    expect(screen.getByText("Keine App passt zu „xyz“.")).toBeInTheDocument();
  });

  it("uses the app list from the build by default", () => {
    render(<App />);

    // The test config sets __POCKET_APPS__ to one app: "Test-App".
    expect(screen.getAllByRole("link", { name: "Test-App" })).toHaveLength(1);
  });
});
