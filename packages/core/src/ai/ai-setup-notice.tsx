import { Alert, AlertDescription, AlertTitle } from "@pocket-apps/ui/components/alert";
import { Button } from "@pocket-apps/ui/components/button";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { AiSettingsDialog } from "./ai-settings-dialog.tsx";

export type AiSetupNoticeProps = {
  /** What the AI does in this app, for example "liest deine Notizen". */
  feature: string;
  /** Called when the dialog closes. Pass `reload` of `useAi()`: it reads the settings again. */
  onClose: () => void;
};

/**
 * The hint for an app without AI access, with a button to the AI settings. Show it when
 * `useAi()` is `not-set-up`. Use it inside `DataFileProvider`.
 */
export function AiSetupNotice({ feature, onClose }: AiSetupNoticeProps) {
  const [open, setOpen] = useState(false);
  return (
    <Alert>
      <Sparkles aria-hidden="true" />
      <AlertTitle>KI einrichten</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        <span>
          Die KI {feature}. Dafür brauchst du einen eigenen API-Key von Claude oder OpenAI.
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setOpen(true);
          }}
        >
          KI einrichten
        </Button>
      </AlertDescription>
      <AiSettingsDialog
        open={open}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
      />
    </Alert>
  );
}
