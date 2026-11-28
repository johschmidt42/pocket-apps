import { Progress } from "@pocket-apps/ui/components/progress";
import { cn } from "@pocket-apps/ui/lib/utils";
import { PLAYER } from "../content/tuning.ts";
import { SEED_SHOOTER } from "../content/weapons.ts";
import type { Hud as HudValues } from "../game/game.ts";
import { ACTION_FONT } from "./action-font.ts";

const SPOTS = Array.from({ length: PLAYER.spots }, (_, index) => index + 1);
const STONES = Array.from({ length: SEED_SHOOTER.seeds }, (_, index) => index + 1);

/**
 * The displays during the game, at the bottom left of the field: the spots of Seven,
 * and the tank pressure or the stones in the drum, for the weapon that he carries.
 * The colors are fixed, as the colors of the picture are.
 */
export function Hud({ hud }: { hud: HudValues }) {
  const locked = hud.weapon === "spray" ? hud.tankLocked : hud.drumLocked;
  return (
    <div
      className={cn(
        ACTION_FONT,
        "absolute bottom-[2.5%] left-[1.5%] flex flex-col gap-[0.6cqw] rounded-[0.8cqw] bg-[rgb(8_14_10/0.55)] px-[1cqw] py-[0.8cqw] text-[1.2cqw] tracking-wider",
      )}
    >
      <p
        role="img"
        aria-label={`Leben: ${String(hud.spots)} von ${String(PLAYER.spots)} Punkten`}
        className="flex gap-[0.4cqw]"
      >
        {SPOTS.map((spot) => (
          <span
            key={spot}
            className={cn(
              // One spot of Seven: a black dot on red. A lost spot is empty.
              "size-[1.2cqw] rounded-full border-[0.28cqw]",
              spot <= hud.spots ? "border-[#e0241b] bg-[#1b1b22]" : "border-[#5a2a28]",
            )}
          />
        ))}
      </p>
      <div
        className={cn("flex items-center gap-[0.8cqw]", locked && "animate-pulse text-[#ff5a4a]")}
      >
        {hud.weapon === "spray" ? (
          <>
            <span className="w-[6.5cqw]">{hud.tankLocked ? "Tank leer" : "Tank"}</span>
            <Progress
              aria-label="Druck im Tank"
              // The component does not give its value to assistive tools. This attribute does it.
              aria-valuenow={hud.pressure}
              value={hud.pressure}
              className="h-[1cqw] w-[11cqw] bg-[#1d2a20] *:bg-[#f2c230]"
            />
          </>
        ) : (
          <>
            <span className="w-[6.5cqw]">{hud.drumLocked ? "Lädt nach" : "Kerne"}</span>
            <span
              role="img"
              aria-label={`Kerne: ${String(hud.seeds)} von ${String(SEED_SHOOTER.seeds)}`}
              // At most 12 stones in one row. A larger drum has more rows.
              className="grid grid-cols-12 gap-[0.25cqw]"
            >
              {STONES.map((stone) => (
                <span
                  key={stone}
                  className={cn(
                    "size-[0.8cqw] rounded-full",
                    stone <= hud.seeds ? "bg-[#f3d39a]" : "bg-[#1d2a20]",
                  )}
                />
              ))}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
