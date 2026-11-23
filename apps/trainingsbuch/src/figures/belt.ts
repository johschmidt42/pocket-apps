// The marks on a ground that moves back under a figure that walks or runs on the spot.
import { GROUND } from "./skeleton.ts";

/** About this far apart. The real distance is a part of the way of one loop, so the loop has no jump. */
const GAP = 28;
const HEIGHT = 4;

/** An SVG path with one short mark for each place on the ground between `left` and `right`. */
export function beltMarks(distance: number, progress: number, left: number, right: number): string {
  const gap = distance / Math.max(1, Math.round(distance / GAP));
  const shift = (((-distance * progress) % gap) + gap) % gap;
  const marks: string[] = [];
  for (let x = Math.ceil((left - shift) / gap) * gap + shift; x <= right; x += gap) {
    marks.push(`M ${x.toFixed(2)} ${String(GROUND + 1)} V ${String(GROUND + 1 + HEIGHT)}`);
  }
  return marks.join(" ");
}
