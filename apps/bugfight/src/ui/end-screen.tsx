import { ActionButton } from "./action-button.tsx";
import { ScreenFrame } from "./screen-frame.tsx";

/** The screen after a game: "won" or "lost", with a new game or the way back to the title. */
export function EndScreen({
  won,
  onAgain,
  onQuit,
}: {
  won: boolean;
  onAgain: () => void;
  onQuit: () => void;
}) {
  return (
    <ScreenFrame
      line={won ? "Die Party ist vorbei, Ameisen." : "Sieben Punkte. Alle weg."}
      title={won ? "Gewonnen" : "Verloren"}
      dim
    >
      <ActionButton main onClick={onAgain}>
        Nochmal
      </ActionButton>
      <ActionButton onClick={onQuit}>Hauptmenü</ActionButton>
    </ScreenFrame>
  );
}
