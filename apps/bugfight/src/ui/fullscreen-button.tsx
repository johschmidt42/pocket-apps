import type { Fullscreen } from "@pocket-apps/core/use-fullscreen";
import { Button } from "@pocket-apps/ui/components/button";
import { Maximize, Minimize } from "lucide-react";

/** A button in the corner of the field. It puts the whole page into full screen, and back. */
export function FullscreenButton({ fullscreen }: { fullscreen: Fullscreen }) {
  if (!fullscreen.possible) return null;
  const label = fullscreen.active ? "Vollbild beenden" : "Vollbild";
  return (
    <Button
      variant="secondary"
      size="icon-sm"
      className="absolute top-[1.5%] right-[1%]"
      aria-label={label}
      title={label}
      onClick={fullscreen.active ? fullscreen.exit : fullscreen.enter}
    >
      {fullscreen.active ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
    </Button>
  );
}
