/** The tokens of a request and the cost in US dollars (`null` without a known price). */
export type AiUsage = { inputTokens: number; outputTokens: number; costUsd: number | null };

// Prices of the Claude models in US dollars per million tokens (input, output). Source: the
// price list of Anthropic as of 2026-11-03. Prices change: the app shows the cost as "ca.".
// OpenAI is not in the list. For its models, the app shows only the tokens.
const CLAUDE_PRICES: Readonly<Record<string, { input: number; output: number }>> = {
  "claude-fable-5-2": { input: 8, output: 40 },
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-fable-5": { input: 10, output: 50 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** The cost of a request in US dollars, or `null` for a model without a known price. */
export function requestCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const price = CLAUDE_PRICES[model];
  if (!price) return null;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

/** "1.234 Token · ca. 0,4 Cent", or only the tokens without a known price. */
export function formatUsage(usage: AiUsage): string {
  const tokens = `${(usage.inputTokens + usage.outputTokens).toLocaleString("de-DE")} Token`;
  return usage.costUsd === null ? tokens : `${tokens} · ${formatCost(usage.costUsd)}`;
}

/** "ca. 0,4 Cent" or "ca. 1,25 $". */
export function formatCost(dollars: number): string {
  if (dollars < 1) {
    const cents = dollars * 100;
    return `ca. ${cents.toLocaleString("de-DE", { maximumFractionDigits: cents < 1 ? 2 : 1 })} Cent`;
  }
  return `ca. ${dollars.toLocaleString("de-DE", { maximumFractionDigits: 2 })} $`;
}
