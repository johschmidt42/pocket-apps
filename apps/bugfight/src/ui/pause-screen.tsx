import { ActionButton } from "./action-button.tsx";
import { ScreenFrame } from "./screen-frame.tsx";

/** The screen of a paused game. */
export function PauseScreen({ onResume, onQuit }: { onResume: () => void; onQuit: () => void }) {
  return (
    <ScreenFrame title="Pause" dim>
      <ActionButton main onClick={onResume}>
        Weiter
      </ActionButton>
      <ActionButton onClick={onQuit}>Hauptmenü</ActionButton>
    </ScreenFrame>
  );
}
