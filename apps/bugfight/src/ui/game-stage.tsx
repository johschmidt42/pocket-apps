import { useFullscreen } from "@pocket-apps/core/use-fullscreen";
import { Alert, AlertDescription, AlertTitle } from "@pocket-apps/ui/components/alert";
import { cn } from "@pocket-apps/ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import { createGame, readOptions, type Game } from "../game/game.ts";
import type { ViewFactory } from "../render/view.ts";
import { Overlay } from "./overlay.tsx";

/**
 * The game: the picture of the field, and the screens and displays on top of it.
 * The field keeps its shape (16:9) and is as large as its area allows.
 */
export function GameStage({ viewFactory }: { viewFactory: ViewFactory }) {
  const [supported] = useState(() => viewFactory.supported());
  const container = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const fullscreen = useFullscreen();

  // The game is an external system: it runs in requestAnimationFrame and draws with WebGL.
  useEffect(() => {
    if (container.current === null) return;
    const created = createGame(
      container.current,
      readOptions(window.location.search),
      viewFactory.create,
    );
    setGame(created);
    return () => {
      created.dispose();
      setGame(null);
    };
  }, [viewFactory]);

  if (!supported) {
    return (
      <main className="mx-auto max-w-xl p-4">
        <Alert>
          <AlertTitle>Das Spiel braucht WebGL 2</AlertTitle>
          <AlertDescription>
            Dein Browser kann das Bild des Spiels nicht zeichnen. Öffne die Seite in einem aktuellen
            Chrome oder Edge.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main
      className={cn(
        // The area is a size container: the field measures itself against its width and height.
        "[container-type:size] grid min-h-0 flex-1 place-items-center bg-[#070b08]",
        // The whole page is in full screen, and the game covers it.
        fullscreen.active && "fixed inset-0 z-40",
      )}
    >
      {/* The field is a size container too: the texts on it use its width as their unit. */}
      <div className="[container-type:size] relative aspect-video w-[min(100cqw,calc(100cqh*16/9))] overflow-hidden text-[#f4f7ee] select-none">
        <div
          ref={container}
          className="size-full data-[screen=playing]:cursor-none [&_canvas]:block"
        />
        {game !== null && <Overlay game={game} fullscreen={fullscreen} />}
      </div>
    </main>
  );
}
