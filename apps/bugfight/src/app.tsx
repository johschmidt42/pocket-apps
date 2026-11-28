import { AppHeader } from "@pocket-apps/core/app-shell";
import { webglViewFactory, type ViewFactory } from "./render/view.ts";
import { GameStage } from "./ui/game-stage.tsx";

/** `viewFactory` is only for tests. jsdom has no WebGL. */
export function App({ viewFactory = webglViewFactory }: { viewFactory?: ViewFactory }) {
  return (
    // The page is as high as the window. The game takes all the room under the header.
    <div className="flex h-dvh flex-col">
      <AppHeader app={__POCKET_APP__} />
      <GameStage viewFactory={viewFactory} />
    </div>
  );
}
