import { describe, expect, it } from "vitest";
import { parseWeekly, weeklyUrl } from "./alpha-vantage.ts";
import { weeklyJson } from "./test-data.ts";

describe("weeklyUrl", () => {
  it("asks for the weekly adjusted prices", () => {
    expect(weeklyUrl("SPYI.DEX", "KEY1")).toBe(
      "https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=SPYI.DEX&apikey=KEY1",
    );
  });
});

describe("parseWeekly", () => {
  it("gives the closes, oldest first", () => {
    const json = weeklyJson([
      { date: "2026-11-09", close: 11 },
      { date: "2026-11-06", close: 10 },
    ]);

    expect(parseWeekly(json)).toEqual({
      kind: "ok",
      points: [
        { date: "2026-11-06", close: 10, total: 10 },
        { date: "2026-11-09", close: 11, total: 11 },
      ],
    });
  });

  it("divides the closes before a split by the split ratio", () => {
    // A 25:1 split between the 2nd and the 3rd week, like SPDR MSCI ACWI IMI in February 2026.
    const json = weeklyJson([
      { date: "2026-02-13", close: 254.45, adjusted: 10.178 },
      { date: "2026-02-20", close: 258, adjusted: 10.32 },
      { date: "2026-02-27", close: 10.318 },
    ]);

    const result = parseWeekly(json);

    expect(result.kind).toBe("ok");
    const closes = result.kind === "ok" ? result.points.map((point) => point.close) : [];
    expect(closes[0]).toBeCloseTo(10.178);
    expect(closes[1]).toBeCloseTo(10.32);
    expect(closes[2]).toBeCloseTo(10.318);
  });

  it("keeps the real close when a dividend changes the adjusted close", () => {
    const json = weeklyJson([
      { date: "2026-03-13", close: 143.22, adjusted: 141.7 },
      { date: "2026-03-20", close: 144, adjusted: 144 },
    ]);

    const result = parseWeekly(json);

    expect(result.kind === "ok" ? result.points.map((point) => point.close) : []).toEqual([
      143.22, 144,
    ]);
  });

  it.each([
    [{ "Error Message": "the parameter apikey is invalid or missing." }, "bad-key"],
    [{ "Error Message": "Invalid API call." }, "unknown-symbol"],
    [
      {
        Information: "Please consider spreading out your free API requests (1 request per second).",
      },
      "too-fast",
    ],
    [{ Information: "Our standard API rate limit is 25 requests per day." }, "limit"],
    [{ Note: "Thank you for using Alpha Vantage!" }, "limit"],
    [{ something: "else" }, "invalid"],
    [{ "Weekly Adjusted Time Series": {} }, "invalid"],
  ])("reads %j as %s", (json, kind) => {
    expect(parseWeekly(json).kind).toBe(kind);
  });
});
