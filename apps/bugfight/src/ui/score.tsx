import { cn } from "@pocket-apps/ui/lib/utils";
import { ACTION_FONT } from "./action-font.ts";

/** The score at the top left of the field: the grains of pollen that Seven collected. */
export function Score({ score }: { score: number }) {
  return (
    <p
      className={cn(
        ACTION_FONT,
        "absolute top-[2.5%] left-[1.5%] flex items-center gap-[0.6cqw] rounded-[0.8cqw] bg-[rgb(8_14_10/0.55)] px-[1cqw] py-[0.5cqw] text-[1.6cqw] tracking-wider",
      )}
    >
      {/* A golden dot, as a grain of pollen in the game. */}
      <span aria-hidden="true" className="size-[1.2cqw] rounded-full bg-[#ffcf3a]" />
      Pollen: {score}
    </p>
  );
}
