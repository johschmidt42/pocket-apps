import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./app.tsx";
import type { FetchResult } from "./fetch-json.ts";
import type { KursverlaufData } from "./schema.ts";
import { daysAgo, fakeFetch, weeklyJson, weeksUntilToday } from "./test-data.ts";

type Rule = { match: string; result: FetchResult };

const SEARCH_VGWL: Rule = {
  match: "symbol_search",
  result: {
    kind: "ok",
    json: {
      data: [
        { symbol: "VWRL", instrument_name: "Vanguard FTSE All-World", mic_code: "XLON" },
        { symbol: "VGWL", instrument_name: "Vanguard FTSE All-World", mic_code: "XETR" },
      ],
    },
  },
};
const weekly = (start: number, step: number): FetchResult => ({
  kind: "ok",
  json: weeklyJson(weeksUntilToday(60, start, step)),
});

function fileText(data: KursverlaufData): string {
  return JSON.stringify({
    app: "kursverlauf",
    schemaVersion: 1,
    savedWith: "1.0",
    savedAt: "2026-11-10T12:00:00.000Z",
    data,
  });
}

/** Opens the app with a folder. `data` is the content of kursverlauf.json, or nothing for a new file. */
async function openApp(rules: readonly Rule[], data?: KursverlaufData) {
  const folder = createMemoryFolder();
  if (data) folder.files.set("kursverlauf.json", { text: fileText(data), lastModified: 1 });
  const fake = fakeFetch(rules);
  const user = userEvent.setup();
  render(
    <App
      folderHost={createMemoryFolderHost({ saved: folder })}
      fetchJson={fake.fetchJson}
      gapMs={0}
    />,
  );
  await screen.findByText(/kursverlauf\.json/);
  return { folder, user, urls: fake.urls };
}

function savedData(folder: ReturnType<typeof createMemoryFolder>): KursverlaufData {
  return (JSON.parse(folder.files.get("kursverlauf.json")?.text ?? "") as { data: KursverlaufData })
    .data;
}

const today = new Date().toISOString();
const ETF_A = { id: "a", isin: "IE00B3RBWM25", symbol: "VGWL.DEX", name: "Vanguard" };
const ETF_B = { id: "b", isin: "", symbol: "SPYI.DEX", name: "SPDR" };
const pricesOf = (start: number, step: number, fetchedAt = today) => ({
  fetchedAt,
  points: weeksUntilToday(60, start, step).map((week) => ({ date: week.date, close: week.close })),
});
const READY: KursverlaufData = {
  apiKey: "KEY12345",
  etfs: [ETF_A, ETF_B],
  prices: { "VGWL.DEX": pricesOf(100, 1), "SPYI.DEX": pricesOf(10, -0.05) },
};

// jsdom has no layout. Recharts measures its container, so give each element a size.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 640,
    bottom: 400,
    width: 640,
    height: 400,
    toJSON: () => ({}),
  });
});

describe("App", () => {
  it("needs Chrome or Edge for the data folder", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Bitte Chrome oder Edge verwenden" }),
    ).toBeInTheDocument();
  });

  it("asks for the API key first and keeps it in the data file", async () => {
    const { folder, user, urls } = await openApp([]);

    expect(
      screen.getByRole("heading", { name: "Kostenlosen API-Key eintragen" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "alphavantage.co" })).toHaveAttribute(
      "href",
      "https://www.alphavantage.co/support/#api-key",
    );
    await user.type(screen.getByLabelText("API-Key"), "kurz");
    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();

    await user.type(screen.getByLabelText("API-Key"), "ABCD1234");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(screen.getByRole("heading", { name: "Noch keine ETFs" })).toBeInTheDocument();
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(savedData(folder).apiKey).toBe("kurzABCD1234");
    expect(urls).toEqual([]);
  });
});

describe("Adding ETFs", () => {
  it("finds an ETF by ISIN, lets the user rename it and loads its prices", async () => {
    const { folder, user, urls } = await openApp(
      [SEARCH_VGWL, { match: "VGWL.DEX", result: weekly(100, 1) }],
      {
        ...READY,
        etfs: [],
        prices: {},
      },
    );

    await user.click(screen.getByRole("button", { name: "ETF hinzufügen" }));
    const dialog = screen.getByRole("dialog", { name: "ETF hinzufügen" });
    await user.type(within(dialog).getByLabelText("ISIN oder Kürzel"), "ie00b3rbwm25{Enter}");

    expect(await within(dialog).findByText("VGWL.DEX")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Treffer")).not.toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText("Name in der App"));
    await user.type(within(dialog).getByLabelText("Name in der App"), "Mein Vanguard");
    await user.click(within(dialog).getByRole("button", { name: "Hinzufügen" }));

    const card = await screen.findByRole("heading", { level: 3, name: "Mein Vanguard" });
    expect(card).toBeInTheDocument();
    expect(await screen.findByText(/Schlusskurs/)).toBeInTheDocument();
    expect(screen.getByText("IE00B3RBWM25 · VGWL.DEX")).toBeInTheDocument();
    // One ETF: no comparison.
    expect(screen.queryByRole("heading", { name: "Vergleich" })).not.toBeInTheDocument();
    expect(urls.filter((url) => url.includes("alphavantage"))).toHaveLength(1);
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(savedData(folder).prices["VGWL.DEX"]?.points).toHaveLength(60);
  });

  it("lets the user pick one of several Xetra hits and blocks a duplicate", async () => {
    const search: Rule = {
      match: "symbol_search",
      result: {
        kind: "ok",
        json: {
          data: [
            { symbol: "SPYI", instrument_name: "SPDR ACWI IMI", mic_code: "XETR" },
            { symbol: "VGWL", instrument_name: "Vanguard FTSE All-World", mic_code: "XETR" },
          ],
        },
      },
    };
    const { user } = await openApp([search], READY);

    await user.click(screen.getByRole("button", { name: "ETF hinzufügen" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("ISIN oder Kürzel"), "acwi");
    await user.click(within(dialog).getByRole("button", { name: "Suchen" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Diesen ETF hast du schon.");
    expect(within(dialog).getByRole("button", { name: "Hinzufügen" })).toBeDisabled();

    await user.selectOptions(within(dialog).getByLabelText("Treffer"), "VGWL.DEX");
    expect(within(dialog).getByLabelText("Name in der App")).toHaveValue("Vanguard FTSE All-World");
  });

  it.each([
    [{ kind: "offline" } as const, "Die Suche geht gerade nicht."],
    [{ kind: "http-error", status: 429 } as const, "unerwartete Antwort"],
    [{ kind: "ok", json: { status: "error" } } as const, "unerwartete Antwort"],
    [
      {
        kind: "ok",
        json: { data: [{ symbol: "VWRL", instrument_name: "x", mic_code: "XLON" }] },
      } as const,
      "Kein Treffer an der Börse Xetra",
    ],
  ])("explains a failed search: %j", async (result, message) => {
    const { user } = await openApp([{ match: "symbol_search", result }], {
      ...READY,
      etfs: [],
      prices: {},
    });

    await user.click(screen.getByRole("button", { name: "ETF hinzufügen" }));
    await user.type(screen.getByLabelText("ISIN oder Kürzel"), "XYZ{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });
});

describe("Prices", () => {
  it("shows the stored prices of today without a request and compares the ETFs", async () => {
    const { user, urls } = await openApp([], READY);

    expect(screen.getByRole("heading", { name: "Vergleich" })).toBeInTheDocument();
    expect(screen.getAllByText("1 Jahr")).not.toHaveLength(0);
    expect(screen.getByText(/Wochenkurse bis .* abgerufen heute/)).toBeInTheDocument();
    expect(screen.getByText(/^Seit /)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kurse aktualisieren" })).toBeDisabled();
    expect(urls).toEqual([]);

    await user.click(screen.getByRole("radio", { name: "6 Monate" }));

    expect(screen.getAllByText("6 Monate")).toHaveLength(3);
  });

  it("loads old prices at the start and shows the errors, and loads again on request", async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const rules: Rule[] = [
      { match: "VGWL.DEX", result: weekly(100, 1) },
      { match: "SPYI.DEX", result: { kind: "ok", json: { Information: "25 requests per day" } } },
    ];
    const { user, urls } = await openApp(rules, {
      ...READY,
      prices: { "VGWL.DEX": pricesOf(90, 1, yesterday), "SPYI.DEX": pricesOf(10, 0, yesterday) },
    });

    expect(await screen.findByText(/25 Abrufe pro Tag/)).toBeInTheDocument();
    expect(urls.filter((url) => url.includes("alphavantage"))).toHaveLength(2);
    // The old prices stay on the screen.
    expect(screen.getAllByText(/Schlusskurs/)).toHaveLength(2);

    rules[1] = { match: "SPYI.DEX", result: weekly(10, 0.1) };
    await user.click(screen.getByRole("button", { name: "Kurse aktualisieren" }));

    expect(await screen.findByText(/abgerufen heute/)).toBeInTheDocument();
    expect(screen.queryByText(/25 Abrufe pro Tag/)).not.toBeInTheDocument();
    // Only SPDR loads again: Vanguard has prices from just now.
    expect(urls.filter((url) => url.includes("alphavantage"))).toHaveLength(3);
  });

  it("says when there are no prices in the range", async () => {
    await openApp([], {
      ...READY,
      etfs: [ETF_A],
      prices: { "VGWL.DEX": { fetchedAt: today, points: [{ date: daysAgo(800), close: 50 }] } },
    });

    expect(screen.getByText("Keine Kurse in diesem Zeitraum.")).toBeInTheDocument();
  });
});

describe("Settings", () => {
  it("loads the prices again after the user fixes a wrong key", async () => {
    const rules: Rule[] = [
      {
        match: "apikey=WRONGKEY",
        result: { kind: "ok", json: { "Error Message": "apikey is invalid" } },
      },
      { match: "VGWL.DEX", result: weekly(100, 1) },
    ];
    const { user, urls } = await openApp(rules, { apiKey: "WRONGKEY", etfs: [ETF_A], prices: {} });

    expect(await screen.findByText(/kennt deinen API-Key nicht/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "API-Key ändern" }));
    await user.clear(screen.getByLabelText("API-Key"));
    await user.type(screen.getByLabelText("API-Key"), "RIGHTKEY1{Enter}");

    expect(await screen.findByText(/Schlusskurs/)).toBeInTheDocument();
    expect(screen.queryByText(/kennt deinen API-Key nicht/)).not.toBeInTheDocument();
    expect(urls.filter((url) => url.includes("alphavantage"))).toHaveLength(2);
  });

  it("removes an ETF after a confirmation", async () => {
    const { folder, user } = await openApp([], READY);
    vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);

    await user.click(screen.getByRole("button", { name: "SPDR entfernen" }));
    expect(screen.getByRole("heading", { level: 3, name: "SPDR" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "SPDR entfernen" }));
    expect(screen.queryByRole("heading", { level: 3, name: "SPDR" })).not.toBeInTheDocument();
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(Object.keys(savedData(folder).prices)).toEqual(["VGWL.DEX"]);
  });

  it("changes the API key", async () => {
    const { folder, user } = await openApp([], READY);

    await user.click(screen.getByRole("button", { name: "API-Key ändern" }));
    const dialog = screen.getByRole("dialog", { name: "API-Key ändern" });
    expect(within(dialog).getByLabelText("API-Key")).toHaveValue("KEY12345");
    await user.clear(within(dialog).getByLabelText("API-Key"));
    await user.type(within(dialog).getByLabelText("API-Key"), "NEWKEY99{Enter}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(savedData(folder).apiKey).toBe("NEWKEY99");

    await user.click(screen.getByRole("button", { name: "API-Key ändern" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "ETF hinzufügen" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
