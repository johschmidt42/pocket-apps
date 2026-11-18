import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AiUsageSummary } from "./ai-usage-summary.tsx";

describe("AiUsageSummary", () => {
  it("shows the cost, the tokens and the part from the cache", () => {
    render(
      <AiUsageSummary
        label="Bisher"
        usage={{ inputTokens: 8000, cachedTokens: 2400, outputTokens: 549, costUsd: 0.044 }}
      />,
    );

    expect(screen.getByText("Bisher:")).toBeInTheDocument();
    expect(screen.getByText("ca. 4,4 US-Cent")).toBeInTheDocument();
    expect(screen.getByText("8.549 Token")).toBeInTheDocument();
    expect(screen.getByText("2.400 aus dem Cache")).toBeInTheDocument();
  });

  it("shows only the tokens without a price and without a cache", () => {
    render(
      <AiUsageSummary
        label="Diese Anfrage"
        usage={{ inputTokens: 10, cachedTokens: 0, outputTokens: 5, costUsd: null }}
      />,
    );

    expect(screen.getByText("15 Token")).toBeInTheDocument();
    expect(screen.queryByText(/Cent/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cache/)).not.toBeInTheDocument();
  });
});
