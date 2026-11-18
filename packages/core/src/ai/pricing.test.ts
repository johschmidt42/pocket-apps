import { describe, expect, it } from "vitest";
import { addUsage, formatCost, formatUsage, requestCost } from "./pricing.ts";

const NO_CACHE = { cacheWrite: 0, cacheRead: 0 };

describe("cost of a request", () => {
  it("knows the prices of the Claude models", () => {
    // Claude Opus 5.5: 4 $ input, 20 $ output per million tokens.
    expect(requestCost("claude-opus-5-5", { ...NO_CACHE, input: 1_000_000, output: 0 })).toBe(4);
    expect(requestCost("claude-opus-5-5", { ...NO_CACHE, input: 2000, output: 500 })).toBeCloseTo(
      0.018,
    );
    expect(requestCost("gpt-x", { ...NO_CACHE, input: 2000, output: 500 })).toBeNull();
  });

  it("counts writes to the cache and reads from the cache", () => {
    const million = { input: 0, output: 0 };
    // A write costs 1.25 × the input price.
    expect(requestCost("claude-opus-5-5", { ...million, cacheWrite: 1e6, cacheRead: 0 })).toBe(5);
    // Claude Opus 5.5 has its own price for a read: 0.20 $.
    expect(requestCost("claude-opus-5-5", { ...million, cacheWrite: 0, cacheRead: 1e6 })).toBe(0.2);
    // Other models: 0.1 × the input price.
    expect(requestCost("claude-opus-5", { ...million, cacheWrite: 0, cacheRead: 1e6 })).toBeCloseTo(
      0.5,
    );
  });

  it("formats cents and dollars in German", () => {
    expect(formatCost(0.018)).toBe("ca. 1,8 US-Cent");
    expect(formatCost(0.004)).toBe("ca. 0,4 US-Cent");
    expect(formatCost(0.00012)).toBe("ca. 0,01 US-Cent");
    expect(formatCost(1.254)).toBe("ca. 1,25 $");
  });

  it("formats the tokens with or without a cost and a cache", () => {
    expect(
      formatUsage({ inputTokens: 2000, cachedTokens: 0, outputTokens: 500, costUsd: 0.018 }),
    ).toBe("2.500 Token · ca. 1,8 US-Cent");
    expect(
      formatUsage({ inputTokens: 2000, cachedTokens: 1800, outputTokens: 500, costUsd: 0.004 }),
    ).toBe("2.500 Token, davon 1.800 aus dem Cache · ca. 0,4 US-Cent");
    expect(formatUsage({ inputTokens: 10, cachedTokens: 0, outputTokens: 5, costUsd: null })).toBe(
      "15 Token",
    );
  });
});

describe("usage of a conversation", () => {
  it("adds the rounds", () => {
    const round = { inputTokens: 100, cachedTokens: 10, outputTokens: 5, costUsd: 0.01 };
    expect(addUsage(null, round)).toBe(round);
    const total = addUsage(round, round);
    expect(total).toMatchObject({ inputTokens: 200, cachedTokens: 20, outputTokens: 10 });
    expect(total.costUsd).toBeCloseTo(0.02);
    expect(addUsage(round, { ...round, costUsd: null }).costUsd).toBeNull();
  });
});
