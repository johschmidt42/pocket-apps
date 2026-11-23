import { Button } from "@pocket-apps/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { Play, Rotate3d } from "lucide-react";
import { useRef, useState } from "react";
import type { View } from "./exercise.ts";
import { runOf, type ExerciseVariants } from "./exercise-motions.ts";
import { Figure } from "./figure.tsx";
import { beltMarks } from "./belt.ts";
import { GROUND } from "./skeleton.ts";
import { useAnimationClock } from "./use-animation-clock.ts";
import { useInView } from "./use-in-view.ts";

/** The speeds of the animation. A tap on the button goes to the next one. */
type Speed = 1 | 0.5 | 0.25;
const NEXT_SPEED: Record<Speed, Speed> = { 1: 0.5, 0.5: 0.25, 0.25: 1 };
const speedText = (speed: Speed) => `${speed.toLocaleString("de-DE")}×`;

const VIEW_NAMES: Record<View["yaw"], string> = { 0: "von der Seite", 90: "von vorn" };

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * One exercise as a looped pictogram. A tap on the figure stops and starts it. The buttons in the
 * corners change the speed and turn the view. An exercise with more than one form has a switch below its name. The
 * figure moves only while the card is on the screen.
 */
export function ExerciseAnimationCard({
  name,
  variants,
}: {
  name: string;
  variants: ExerciseVariants;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [yaw, setYaw] = useState<View["yaw"]>(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [speed, setSpeed] = useState<Speed>(1);
  const seconds = useAnimationClock(inView && playing, speed);

  // Without a form of this key (another workout), the first form shows.
  const variant = variants.find((item) => item.key === chosen) ?? variants[0];
  const { exercise } = variant;
  // Some exercises have only the side view: it says more than a view from the front.
  const view = exercise.views.find((item) => item.yaw === yaw) ?? exercise.views[0];
  const other = exercise.views.find((item) => item.yaw !== view.yaw);
  const { box } = view;
  const [x, , width] = box;
  const frame = runOf(exercise).at(seconds);
  const scroll = (exercise.scroll ?? 0) * (frame.progress % 1);
  const title = variant.label === null ? name : `${name} ${variant.label}`;
  return (
    <div
      ref={rootRef}
      className="flex h-full flex-col gap-1 rounded-2xl border bg-card p-2 text-card-foreground"
    >
      <figure className="flex flex-col items-center gap-1">
        <div className="relative h-44 w-full sm:h-52">
          <Button
            variant="ghost"
            aria-label={`${title} ${VIEW_NAMES[view.yaw]} ${playing ? "anhalten" : "abspielen"}`}
            className="size-full touch-manipulation rounded-xl p-0 hover:bg-transparent dark:hover:bg-transparent"
            onClick={() => {
              setPlaying(!playing);
            }}
          >
            <svg
              aria-hidden="true"
              viewBox={box.join(" ")}
              className="size-full"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
            >
              {exercise.ground !== false && (
                <line
                  x1={x + 6}
                  y1={GROUND + 1}
                  x2={x + width - 6}
                  y2={GROUND + 1}
                  stroke="var(--border)"
                  strokeWidth={2}
                />
              )}
              {exercise.belt !== undefined && view.yaw === 0 && (
                <path
                  d={beltMarks(exercise.belt, frame.progress, x + 6, x + width - 6)}
                  stroke="var(--border)"
                  strokeWidth={2}
                />
              )}
              <g transform={`translate(0 ${String(scroll)})`}>
                <Figure frame={frame} yaw={view.yaw} equipment={exercise.equipment} />
              </g>
            </svg>
          </Button>
          {!playing && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-background/90 shadow-sm">
                <Play aria-hidden="true" className="size-5" />
              </span>
            </span>
          )}
          <Button
            size="xs"
            variant="ghost"
            aria-label={`Tempo von ${name}: ${speedText(speed)}`}
            className="absolute top-0 left-0 text-muted-foreground tabular-nums pointer-coarse:h-8"
            onClick={() => {
              setSpeed(NEXT_SPEED[speed]);
            }}
          >
            {speedText(speed)}
          </Button>
          {other && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`${name} ${VIEW_NAMES[other.yaw]} zeigen`}
              className="absolute top-0 right-0 text-muted-foreground"
              onClick={() => {
                setYaw(other.yaw);
              }}
            >
              <Rotate3d />
            </Button>
          )}
        </div>
        <figcaption className="text-center text-sm font-medium">
          {variants.length === 1 ? title : name}
        </figcaption>
      </figure>
      {variants.length > 1 && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label={`Variante von ${name}`}
          className={variants.length > 2 ? "grid w-full grid-cols-3" : "grid w-full grid-cols-2"}
          value={variant.key}
          onValueChange={(value) => {
            if (value !== "") setChosen(value);
          }}
        >
          {variants.map((item) => (
            <ToggleGroupItem key={item.key} value={item.key} className="min-w-0 px-1 text-xs">
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    </div>
  );
}
