/**
 * The tokens of a request and the cost in US dollars (`null` without a known price).
 * `inputTokens` counts all input, also the part from the cache. `cachedTokens` is that part.
 */
export type AiUsage = {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  costUsd: number | null;
};

/** The input tokens of a Claude request, in the three groups that have different prices. */
export type ClaudeTokens = { input: number; cacheWrite: number; cacheRead: number; output: number };

type Price = { input: number; output: number; cacheRead?: number };

// Prices of the Claude models in US dollars per million tokens. Source: the price list of
// Anthropic as of 2026-11-18. Prices change: the app shows the cost as "ca.".
// `cacheRead`: the price of input from the cache, if it is not 0.1 × `input`.
// OpenAI is not in the list. For its models, the app shows only the tokens.
const CLAUDE_PRICES: Readonly<Record<string, Price>> = {
  "claude-fable-5-2": { input: 8, output: 40, cacheRead: 0.2 },
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25 },
  "claude-fable-5": { input: 10, output: 50 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** A write to the cache (5 minutes) costs 1.25 × the input price. */
const CACHE_WRITE_FACTOR = 1.25;
const CACHE_READ_FACTOR = 0.1;

/** The cost of a request in US dollars, or `null` for a model without a known price. */
export function requestCost(model: string, tokens: ClaudeTokens): number | null {
  const price = CLAUDE_PRICES[model];
  if (!price) return null;
  const cacheRead = price.cacheRead ?? price.input * CACHE_READ_FACTOR;
  return (
    (tokens.input * price.input +
      tokens.cacheWrite * price.input * CACHE_WRITE_FACTOR +
      tokens.cacheRead * cacheRead +
      tokens.output * price.output) /
    1_000_000
  );
}

/**
 * "2.500 Token · ca. 0,4 Cent", with "davon 1.800 aus dem Cache" if the cache gave a part.
 * Without a known price, only the tokens.
 */
export function formatUsage(usage: AiUsage): string {
  const total = (usage.inputTokens + usage.outputTokens).toLocaleString("de-DE");
  const cached =
    usage.cachedTokens > 0
      ? `, davon ${usage.cachedTokens.toLocaleString("de-DE")} aus dem Cache`
      : "";
  const tokens = `${total} Token${cached}`;
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
