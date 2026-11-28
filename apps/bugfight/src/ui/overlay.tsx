import { useEffect, useSyncExternalStore } from "react";
import type { Game } from "../game/game.ts";
import { DebugPanel } from "./debug-panel.tsx";
import { EndScreen } from "./end-screen.tsx";
import { FullscreenButton } from "./fullscreen-button.tsx";
import { Hud } from "./hud.tsx";
import { PauseScreen } from "./pause-screen.tsx";
import { TitleScreen } from "./title-screen.tsx";

/** All that lies on top of the picture: the displays, the screen of the game flow and the debug panel. */
export function Overlay({ game, fullscreen }: { game: Game; fullscreen: boolean }) {
  const info = useSyncExternalStore(game.subscribe, game.info);

  // "#" or F1 opens and closes the debug panel. On a Mac, F1 needs the fn key, thus the second key.
  // The Enter key does the same as the main button of the screen: start, resume or a new game.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      // The Enter key on a button that has the focus presses this button.
      if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
        game.start();
        game.resume();
        game.again();
        return;
      }
      if (event.key !== "F1" && event.key !== "#") return;
      event.preventDefault();
      game.toggleDebug();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [game]);

  return (
    <>
      {info.screen !== "title" && <Hud hud={info.hud} />}
      {info.screen === "title" && <TitleScreen onStart={game.start} />}
      {info.screen === "paused" && <PauseScreen onResume={game.resume} onQuit={game.quit} />}
      {(info.screen === "won" || info.screen === "lost") && (
        <EndScreen won={info.screen === "won"} onAgain={game.again} onQuit={game.quit} />
      )}
      {/* During the game, the browser keeps the mouse pointer. Then nobody can click this button. */}
      {info.screen !== "playing" && <FullscreenButton fullscreen={fullscreen} />}
      {info.debug && <DebugPanel game={game} info={info} />}
    </>
  );
}
