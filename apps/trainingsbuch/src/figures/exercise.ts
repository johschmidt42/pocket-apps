// What one exercise is: key poses, steps, equipment and views. Only data.
import type { Pose, Step } from "./skeleton.ts";

export type Equipment =
  | { kind: "none" }
  /**
   * A barbell in both hands. `onBack`: the bar lies on the upper back (back squat). The front view
   * then draws it behind the body, also when the torso leans and the bar is nearer to the camera
   * than the hips. `empty`: a bar without plates (a run with an empty barbell).
   */
  | { kind: "barbell"; onBack?: boolean; empty?: boolean }
  /**
   * A medicine ball in both hands (radius 17). Its center is 6 above the middle of the hands, as in
   * the wall ball.
   */
  | { kind: "medicineball" }
  /**
   * Lines on the floor at these x (a shuttle run). From the side, each is a short flat mark on the
   * ground; from the front, a line across. They stay on their spots when the figure turns around.
   */
  | { kind: "lines"; x: readonly number[] }
  /**
   * A glute-ham developer (GHD sit-up, back extension). `x` is the middle of the hip pad (see `GHD`
   * in `machines.ts`).
   */
  | { kind: "ghd"; x: number }
  /**
   * A dumbbell in one hand: 0 is the near hand, 1 the far hand. `swap`: between these two parts of
   * the loop (0 to 1), the other hand holds it. Both hands must be on the dumbbell at these moments.
   */
  | { kind: "dumbbell"; hand: 0 | 1; swap?: readonly [number, number] }
  /**
   * Two dumbbells, one in each hand, parallel to the way of the figure (a farmers carry). From the
   * side, each one is a bar with two plates. From the front, it is a circle at the hand.
   */
  | { kind: "dumbbells" }
  /**
   * Two kettlebells, one in each hand. Each bell hangs straight below its hand (a farmers carry). In
   * a rack and overhead, the bell lies on the outside of the forearm (`heldBell`). `hand`: only this
   * hand holds a bell (a single-arm lift).
   */
  | { kind: "kettlebells"; hand?: 0 | 1 }
  /**
   * A kettlebell in both hands. Give the two hands one spot and a small `grip` (2 to 3).
   * The bell is in line with the forearms: it hangs below hands that hang, and it is above hands that are overhead.
   * `hangs: true`: the bell hangs straight below the hands, whatever the forearms do (the goblet squat).
   */
  | { kind: "kettlebell"; hangs?: boolean }
  /**
   * A wall at `x = wall`, to the right of the figure.
   * In a handstand push-up, the back of the figure is at the wall, and the heels touch it.
   * `side: "left"`: the wall is behind the feet of a figure that looks to +x. In a wall walk, the
   * chest comes to the wall.
   */
  | { kind: "wall"; wall: number; side?: "left" }
  /**
   * A wall ball. The figure looks at a wall at `x = wall`. `target` is the y of the target line on the wall.
   * The two hands hold the ball: one spot for `hands`, `grip: 15`. The center of the ball is 6 above the hands.
   * In a step with `throw`, the ball is in the air.
   */
  | { kind: "wallball"; wall: number; target: number }
  /**
   * An AbMat on the ground: a small curved pad under the lower back. `x` is its front edge, just behind the hips
   * of the figure that sits. The pad is 30 long (toward -x) and 6 high. The body hides it when the figure lies.
   */
  | { kind: "abmat"; x: number }
  /**
   * A rowing machine. The figure sits on its seat and looks at the flywheel (+x). `x` is the x of the ankles
   * on the foot plates. The places of its parts are in `ROWER` (`machines.ts`). The seat follows the hip,
   * and the handle with its chain follows the hands.
   */
  | { kind: "rower"; x: number }
  /**
   * A SkiErg. The figure stands in front of its tower and looks at it (+x). `x` is the x of the tower.
   * The places of its parts are in `SKIERG` (`machines.ts`). One cord goes from the top to each hand.
   */
  | { kind: "skierg"; x: number }
  /**
   * An air bike (Echo Bike, Assault Bike). The figure sits on its saddle and looks at the fan (+x).
   * `x` is the x of the hip joint on the saddle. The places of its parts are in `BIKE` (`machines.ts`).
   * The cranks follow the feet, and the two levers follow the hands.
   */
  | { kind: "bike"; x: number }
  /**
   * A loaded barbell on the floor at `x`, from side to side (a bar-facing burpee). It is drawn
   * behind the figure. Only the side view shows it.
   */
  | { kind: "floorbar"; x: number }
  /**
   * A weight plate in both hands, held at its edge. Its flat side looks forward: from the side it
   * is a thin bar, from the front a circle. Its center is between the hands.
   */
  | { kind: "plate" }
  /**
   * A flat bench and a barbell in both hands (bench press). `x` is the end of the bench at the
   * head. The sizes are in `BENCH`. The figure lies on it with the head at -x.
   */
  | { kind: "bench"; x: number }
  /** A box on the ground. `x` is its near edge. */
  | { kind: "box"; x: number; width: number; height: number }
  /** A climbing rope that hangs at `x`. */
  | { kind: "rope"; x: number }
  /**
   * A pull-up bar. It is fixed in space at `x`, `y` and goes from side to side.
   * From the side, it is a small circle. The hands hold it: give them the same `x` and `y`.
   */
  | { kind: "pullupbar"; x: number; y: number }
  /**
   * Two gymnastic rings, one in each hand (see `RINGS` in `machines.ts`). `x` and `y` are the grip when the
   * straps hang straight down. The hand holds the bottom of the ring: the ring is above the hand.
   */
  | { kind: "rings"; x: number; y: number }
  /**
   * A jump rope from hand to hand. It turns `turns` times in one loop of the exercise.
   * `phase` is where it starts, as a part of one turn: 0 is over the head, 0.25 in front, 0.5 under the feet.
   * `radius` is how far the middle of the rope is from the hands.
   */
  | { kind: "jumprope"; turns: number; phase: number; radius: number }
  /**
   * A dumbbell on the floor beside the figure, for a lateral jump over it (a lateral burpee over the
   * dumbbell). The figure cannot move to the side, so the dumbbell does: it lies at `z = side` at
   * the start, and in each part of the loop in `crossings` (from, to) it goes under the figure to
   * the other side. Its handle goes along x, at `x`.
   */
  | {
      kind: "floordumbbell";
      x: number;
      side: number;
      crossings: readonly (readonly [number, number])[];
    };

/** A view: from which side the camera looks, and which part of the scene it shows. */
export type View = {
  label: string;
  /** 0: from the side. 90: from the front. */
  yaw: 0 | 90;
  /** x, y, width, height of the SVG view box. */
  box: readonly [number, number, number, number];
};

export type Exercise = {
  key: string;
  title: string;
  start: Pose;
  steps: Step[];
  equipment: Equipment;
  /** The first view shows first. */
  views: readonly [View, ...View[]];
  /**
   * The camera follows the figure: after one loop, the scene is this far lower.
   * For the rope climb: the figure climbs, and the rope moves down.
   */
  scroll?: number;
  /**
   * A gait on the spot: the ground moves back this far in one loop, at the speed of the foot on the
   * ground. The side view shows it with small marks on the ground line.
   */
  belt?: number;
  /**
   * The figure crosses this x in each repetition and turns around (a bar-facing burpee). The steps
   * are one repetition and end in the start pose. `motionOf()` plays them twice: the second time
   * mirrored about this x.
   */
  turnAxis?: number;
  /** False: there is no ground in the picture (rope climb, pull-up bar). */
  ground?: boolean;
};

/** A picture that is much wider than high (a machine) takes two columns. */
export const isWide = (exercise: Exercise): boolean => {
  const [, , width, height] = exercise.views[0].box;
  return width / height > 1.3;
};

// The top is at -14: a bar overhead is at y = 12, and its plate has the radius 17.
export const SIDE: View = { label: "Seite", yaw: 0, box: [14, -14, 120, 226] };
export const FRONT: View = { label: "Vorn", yaw: 90, box: [-60, -14, 120, 226] };

/** The z of a dumbbell on the floor at this part of the loop. It crosses with a smooth start and end. */
export function floorDumbbellZ(
  equipment: { side: number; crossings: readonly (readonly [number, number])[] },
  progress: number,
): number {
  const part = progress - Math.floor(progress);
  let z = equipment.side;
  for (const [from, to] of equipment.crossings) {
    if (part >= to) z = -z;
    else if (part > from) {
      const t = (part - from) / (to - from);
      return z - 2 * z * t * t * (3 - 2 * t);
    }
  }
  return z;
}

/** The hand that holds a single dumbbell at this part of the loop. */
export function dumbbellHand(
  equipment: { hand: 0 | 1; swap?: readonly [number, number] },
  progress: number,
): 0 | 1 {
  const part = progress - Math.floor(progress);
  const swapped =
    equipment.swap !== undefined && part >= equipment.swap[0] && part < equipment.swap[1];
  if (!swapped) return equipment.hand;
  return equipment.hand === 0 ? 1 : 0;
}
