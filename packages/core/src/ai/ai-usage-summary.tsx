import { Badge } from "@pocket-apps/ui/components/badge";
import { Coins, DatabaseZap, Hash } from "lucide-react";
import { formatCost, type AiUsage } from "./pricing.ts";

export type AiUsageSummaryProps = {
  usage: AiUsage;
  /** The text before the badges, for example "Bisher" for all rounds of a conversation. */
  label: string;
};

/**
 * The cost and the tokens of a request or a conversation, as small badges with icons:
 * "ca. 4,4 US-Cent", "8.549 Token" and, if the cache gave a part, "2.400 aus dem Cache".
 * Without a known price (OpenAI), only the tokens.
 */
export function AiUsageSummary({ usage, label }: AiUsageSummaryProps) {
  const tokens = (usage.inputTokens + usage.outputTokens).toLocaleString("de-DE");
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span>{label}:</span>
      {usage.costUsd !== null && (
        <Badge variant="secondary">
          <Coins aria-hidden="true" />
          {formatCost(usage.costUsd)}
        </Badge>
      )}
      <Badge variant="outline" className="font-normal text-muted-foreground">
        <Hash aria-hidden="true" />
        {tokens} Token
      </Badge>
      {usage.cachedTokens > 0 && (
        <Badge variant="outline" className="font-normal text-muted-foreground">
          <DatabaseZap aria-hidden="true" />
          {usage.cachedTokens.toLocaleString("de-DE")} aus dem Cache
        </Badge>
      )}
    </p>
  );
}
