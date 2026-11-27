import { Button } from "@pocket-apps/ui/components/button";
import { Download } from "lucide-react";
import { useInstall } from "./install.ts";

/**
 * Opens the install dialog of the browser. Shows only when the browser can install the app.
 * On a phone, it shows only the icon.
 */
export function InstallButton() {
  const install = useInstall();
  if (install === null) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Als App installieren"
      onClick={() => {
        void install();
      }}
    >
      <Download data-icon="inline-start" />
      <span className="hidden sm:inline">Installieren</span>
    </Button>
  );
}
