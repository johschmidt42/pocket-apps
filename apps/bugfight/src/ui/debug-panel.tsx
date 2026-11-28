import { Button } from "@pocket-apps/ui/components/button";
import { Checkbox } from "@pocket-apps/ui/components/checkbox";
import { Label } from "@pocket-apps/ui/components/label";
import { MAX_LEVEL } from "../content/tuning.ts";
import type { Game, GameInfo } from "../game/game.ts";

const TIME_FACTORS = [0.1, 0.25, 0.5, 1, 2, 4];
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, index) => index + 1);

/**
 * The tools of the developer. The panel shows numbers during the game.
 * Its buttons need a free mouse pointer: pause the game with Esc first.
 */
export function DebugPanel({ game, info }: { game: Game; info: GameInfo }) {
  const { stats } = info;
  const numbers: [string, string][] = [
    ["Bilder pro Sekunde", String(stats.picturesPerSecond)],
    ["Tick", String(stats.tick)],
    ["Seven", `${String(Math.round(stats.x))} / ${String(Math.round(stats.y))}`],
    ["Gaswolken", String(stats.puffs)],
    ["Gegner", String(stats.enemies)],
    ["Tropfen", String(stats.drops)],
    ["Mauszeiger", stats.pointer === "locked" ? "gefangen" : "frei"],
  ];
  return (
    <aside
      aria-label="Debug"
      className="absolute top-2 right-12 flex w-60 flex-col gap-2 rounded-lg bg-card/90 p-3 text-xs text-card-foreground select-text"
    >
      <h2 className="text-sm font-semibold">Debug</h2>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
        {numbers.map(([name, value]) => (
          <div key={name} className="contents">
            <dt>{name}</dt>
            <dd className="text-right tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center gap-2">
        <Checkbox
          id="debug-hit-areas"
          checked={info.hitAreas}
          onCheckedChange={(checked) => {
            game.setHitAreas(checked === true);
          }}
        />
        <Label htmlFor="debug-hit-areas" className="cursor-pointer text-xs">
          Trefferzonen zeigen
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="debug-immortal"
          checked={info.immortal}
          onCheckedChange={(checked) => {
            game.setImmortal(checked === true);
          }}
        />
        <Label htmlFor="debug-immortal" className="cursor-pointer text-xs">
          Unverwundbar
        </Label>
      </div>
      <fieldset className="flex flex-wrap gap-1">
        <legend className="mb-1">Zeit</legend>
        {TIME_FACTORS.map((factor) => (
          <Button
            key={factor}
            size="xs"
            className="pointer-coarse:h-8"
            variant={info.timeFactor === factor ? "default" : "outline"}
            aria-pressed={info.timeFactor === factor}
            onClick={() => {
              game.setTimeFactor(factor);
            }}
          >
            {factor}×
          </Button>
        ))}
      </fieldset>
      <fieldset className="flex flex-wrap gap-1">
        <legend className="mb-1">Feuerkraft</legend>
        {LEVELS.map((level) => (
          <Button
            key={level}
            size="xs"
            className="pointer-coarse:h-8"
            variant={info.hud.level === level ? "default" : "outline"}
            aria-pressed={info.hud.level === level}
            onClick={() => {
              game.setLevel(level);
            }}
          >
            {level}
          </Button>
        ))}
      </fieldset>
      <Button
        size="xs"
        className="pointer-coarse:h-8"
        variant="outline"
        disabled={info.screen !== "paused"}
        onClick={game.singleTick}
      >
        Ein Tick weiter
      </Button>
      <p className="text-muted-foreground">Für die Knöpfe: zuerst mit Esc pausieren.</p>
    </aside>
  );
}
