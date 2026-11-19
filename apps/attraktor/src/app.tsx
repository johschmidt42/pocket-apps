import { AppHeader } from "@pocket-apps/core/app-shell";
import { useSubPage } from "@pocket-apps/core/sub-page";
import { TooltipProvider } from "@pocket-apps/ui/components/tooltip";
import { useState } from "react";
import { AttractorStage } from "./attractor-stage.tsx";
import { ATTRACTORS } from "./attractors.ts";
import { Gallery } from "./gallery.tsx";
import type { MouseMode } from "./mouse-effects.ts";
import { findPalette, type PaletteId } from "./palettes.ts";
import { webglViewFactory, type ViewFactory } from "./webgl-view.ts";

/** `viewFactory` is only for tests. jsdom has no WebGL. */
export function App({ viewFactory = webglViewFactory }: { viewFactory?: ViewFactory }) {
  // The open attractor is a sub-page: the back button of the browser shows the gallery again.
  const { page, open, back } = useSubPage();
  // An unknown ID in the URL (for example an old link) shows the gallery.
  const attractor = ATTRACTORS.find((candidate) => candidate.id === page) ?? null;
  const [mode, setMode] = useState<MouseMode>("lens");
  // null: each attractor shows its own colors. After a choice, all attractors use it.
  const [paletteId, setPaletteId] = useState<PaletteId | null>(null);

  return (
    <TooltipProvider>
      <AppHeader app={__POCKET_APP__} />
      {attractor === null ? (
        <Gallery
          onSelect={(selected) => {
            open(selected.id);
          }}
        />
      ) : (
        <AttractorStage
          // A new attractor starts a new scene.
          key={attractor.id}
          attractor={attractor}
          mode={mode}
          onModeChange={setMode}
          palette={findPalette(paletteId ?? attractor.palette)}
          onPaletteChange={setPaletteId}
          onBack={back}
          viewFactory={viewFactory}
        />
      )}
    </TooltipProvider>
  );
}
