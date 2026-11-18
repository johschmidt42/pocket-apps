import { describe, expect, it } from "vitest";
import { formatCost, formatUsage, requestCost } from "./pricing.ts";

describe("cost of a request", () => {
  it("knows the prices of the Claude models", () => {
    // Claude Opus 5.5: 4 $ input, 20 $ output per million tokens.
    expect(requestCost("claude-opus-5-5", 1_000_000, 0)).toBe(4);
    expect(requestCost("claude-opus-5-5", 2000, 500)).toBeCloseTo(0.018);
    expect(requestCost("gpt-x", 2000, 500)).toBeNull();
  });

  it("formats cents and dollars in German", () => {
    expect(formatCost(0.018)).toBe("ca. 1,8 Cent");
    expect(formatCost(0.004)).toBe("ca. 0,4 Cent");
    expect(formatCost(0.00012)).toBe("ca. 0,01 Cent");
    expect(formatCost(1.254)).toBe("ca. 1,25 $");
  });

  it("formats the tokens with or without a cost", () => {
    expect(formatUsage({ inputTokens: 2000, outputTokens: 500, costUsd: 0.018 })).toBe(
      "2.500 Token · ca. 1,8 Cent",
    );
    expect(formatUsage({ inputTokens: 10, outputTokens: 5, costUsd: null })).toBe("15 Token");
  });
});
