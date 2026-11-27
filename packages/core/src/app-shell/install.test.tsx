import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { testAppInfo } from "../testing.ts";
import { AppHeader } from "./app-header.tsx";
import { isInstalledApp, listenForInstall } from "./install.ts";

/** Acts like Chrome when the page is installable: it fires "beforeinstallprompt". */
function fireInstallPrompt(prompt: () => Promise<unknown> = () => Promise.resolve()) {
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn(prompt),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

/** Acts like the browser in an installed app (its own window). */
function runAsInstalledApp() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(display-mode: standalone)",
  }));
}

beforeAll(() => {
  listenForInstall();
  // A second call (for example a second mountApp) adds no second listener.
  listenForInstall();
});

afterEach(() => {
  // The browser forgets the prompt after an install. The next test starts without it.
  act(() => {
    window.dispatchEvent(new Event("appinstalled"));
  });
});

describe("install button", () => {
  it("does not show while the browser cannot install the app", () => {
    render(<AppHeader app={testAppInfo()} />);

    expect(screen.queryByRole("button", { name: "Als App installieren" })).not.toBeInTheDocument();
  });

  it("shows when the browser can install the app and opens the install dialog", async () => {
    const user = userEvent.setup();
    render(<AppHeader app={testAppInfo()} />);

    const event = fireInstallPrompt();
    // The button replaces the install banner of the browser.
    expect(event.defaultPrevented).toBe(true);
    await user.click(screen.getByRole("button", { name: "Als App installieren" }));

    expect(event.prompt).toHaveBeenCalledOnce();
    // The browser allows the dialog only once per event.
    expect(screen.queryByRole("button", { name: "Als App installieren" })).not.toBeInTheDocument();
  });

  it("hides when the browser does not open the dialog", async () => {
    const user = userEvent.setup();
    render(<AppHeader app={testAppInfo()} />);

    fireInstallPrompt(() => Promise.reject(new DOMException("Not allowed.", "NotAllowedError")));
    await user.click(screen.getByRole("button", { name: "Als App installieren" }));

    expect(screen.queryByRole("button", { name: "Als App installieren" })).not.toBeInTheDocument();
  });

  it("hides after the install", () => {
    render(<AppHeader app={testAppInfo()} />);
    fireInstallPrompt();

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(screen.queryByRole("button", { name: "Als App installieren" })).not.toBeInTheDocument();
  });

  it("ignores an event without the install dialog", () => {
    render(<AppHeader app={testAppInfo()} />);

    act(() => {
      window.dispatchEvent(new Event("beforeinstallprompt"));
    });

    expect(screen.queryByRole("button", { name: "Als App installieren" })).not.toBeInTheDocument();
  });
});

describe("installed app", () => {
  it("has no back link and no install button", () => {
    runAsInstalledApp();
    render(<AppHeader app={testAppInfo()} />);
    fireInstallPrompt();

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Alle Apps" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Als App installieren" })).not.toBeInTheDocument();
  });

  it("is not an installed app in a browser tab", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));

    expect(isInstalledApp()).toBe(false);
  });

  it("is not an installed app without matchMedia", () => {
    // jsdom has no matchMedia.
    expect(isInstalledApp()).toBe(false);
  });
});
