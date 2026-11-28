import { ActionButton } from "./action-button.tsx";
import { ScreenFrame } from "./screen-frame.tsx";

/** The first screen: the name of the game and the button "Start". */
export function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <ScreenFrame line="Sieben Punkte. Null Gnade." title="Bugfight" large>
      <ActionButton main onClick={onStart}>
        Start
      </ActionButton>
      <p className="text-[1.3cqw] [text-shadow:0_1px_6px_rgb(0_0_0/0.9)]">
        Maus: fliegen · Linke Taste: Waffe · 1 und 2: Waffe wechseln · Esc: Pause
      </p>
    </ScreenFrame>
  );
}
