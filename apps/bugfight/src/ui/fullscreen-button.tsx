import { Button } from "@pocket-apps/ui/components/button";
import { Maximize, Minimize } from "lucide-react";
import { useState } from "react";

/** A button in the corner of the field. It puts the whole page into full screen, and back. */
export function FullscreenButton({ fullscreen }: { fullscreen: boolean }) {
  // The browser has no Fullscreen API in an iframe without permission, and on an iPhone.
  const [possible] = useState(() => document.fullscreenEnabled);
  if (!possible) return null;

  function toggle(): void {
    const change = fullscreen
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    change.catch(() => {
      // The browser refused. The game stays as it is.
    });
  }

  return (
    <Button
      variant="secondary"
      size="icon-sm"
      className="absolute top-[1.5%] right-[1%]"
      aria-label={fullscreen ? "Vollbild beenden" : "Vollbild"}
      title={fullscreen ? "Vollbild beenden" : "Vollbild"}
      onClick={toggle}
    >
      {fullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
    </Button>
  );
}
