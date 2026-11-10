import { AppHeader } from "@pocket-apps/core/app-shell";
import { TooltipProvider } from "@pocket-apps/ui/components/tooltip";
import { useState } from "react";
import { AttractorStage } from "./attractor-stage.tsx";
import type { Attractor } from "./attractors.ts";
import { Gallery } from "./gallery.tsx";
import type { MouseMode } from "./mouse-effects.ts";
import { findPalette, type PaletteId } from "./palettes.ts";
import { webglViewFactory, type ViewFactory } from "./webgl-view.ts";

type Screen = { kind: "gallery" } | { kind: "stage"; attractor: Attractor };

/** `viewFactory` is only for tests. jsdom has no WebGL. */
export function App({ viewFactory = webglViewFactory }: { viewFactory?: ViewFactory }) {
  const [screen, setScreen] = useState<Screen>({ kind: "gallery" });
  const [mode, setMode] = useState<MouseMode>("lens");
  // null: each attractor shows its own colors. After a choice, all attractors use it.
  const [paletteId, setPaletteId] = useState<PaletteId | null>(null);

  return (
    <TooltipProvider>
      <AppHeader app={__POCKET_APP__} />
      {screen.kind === "gallery" ? (
        <Gallery
          onSelect={(attractor) => {
            setScreen({ kind: "stage", attractor });
          }}
        />
      ) : (
        <AttractorStage
          // A new attractor starts a new scene.
          key={screen.attractor.id}
          attractor={screen.attractor}
          mode={mode}
          onModeChange={setMode}
          palette={findPalette(paletteId ?? screen.attractor.palette)}
          onPaletteChange={setPaletteId}
          onBack={() => {
            setScreen({ kind: "gallery" });
          }}
          viewFactory={viewFactory}
        />
      )}
    </TooltipProvider>
  );
}
