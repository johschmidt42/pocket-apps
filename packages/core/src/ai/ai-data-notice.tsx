import { ShieldCheck } from "lucide-react";
import { AI_PROVIDER_LABELS, type AiProvider } from "./settings.ts";

export type AiDataNoticeProps = {
  provider: AiProvider;
  /** What the app sends, for example "deine Notizen und die Namen der Workouts". */
  data: string;
};

/** Says before a request which data goes to which provider. AGENTS.md asks for it. */
export function AiDataNotice({ provider, data }: AiDataNoticeProps) {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Diese Daten gehen an {AI_PROVIDER_LABELS[provider]}: {data}. Sonst nichts.
      </span>
    </p>
  );
}
