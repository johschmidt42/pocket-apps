import { Badge } from "@pocket-apps/ui/components/badge";
import type { Division } from "./schema.ts";
import { DIVISION_LABELS } from "./score.ts";

/** "Rx" or "Scaled" as a badge. Nothing for a result without this mark. */
export function DivisionBadge({ division }: { division: Division | null }) {
  if (division === null) return null;
  return (
    <Badge variant={division === "rx" ? "default" : "secondary"}>{DIVISION_LABELS[division]}</Badge>
  );
}
