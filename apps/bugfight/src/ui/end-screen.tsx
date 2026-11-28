import { ActionButton } from "./action-button.tsx";
import { ScreenFrame } from "./screen-frame.tsx";

/** The screen after a game: "won" or "lost", with a new game or the way back to the title. */
export function EndScreen({
  won,
  score,
  onAgain,
  onQuit,
}: {
  won: boolean;
  /** The grains of pollen that Seven collected in this game. */
  score: number;
  onAgain: () => void;
  onQuit: () => void;
}) {
  return (
    <ScreenFrame
      line={won ? "Die Party ist vorbei, Ameisen." : "Sieben Punkte. Alle weg."}
      title={won ? "Gewonnen" : "Verloren"}
      dim
    >
      <p className="text-[2cqw] font-bold [text-shadow:0_2px_8px_rgb(0_0_0/0.8)]">
        Pollen gesammelt: {score}
      </p>
      <ActionButton main onClick={onAgain}>
        Nochmal
      </ActionButton>
      <ActionButton onClick={onQuit}>Hauptmenü</ActionButton>
    </ScreenFrame>
  );
}
