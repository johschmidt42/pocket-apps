// Helpers that each exercise author wrote again: now they are here, once.
import { BODY, up, type Pose } from "./skeleton.ts";

type Spot2 = { x: number; y: number };

/** The center of the shoulders of a pose with this hip and lean. */
export function shoulderOf(hip: Spot2, lean: number): Spot2 {
  const torso = up(lean);
  return { x: hip.x + torso.x * BODY.torso, y: hip.y + torso.y * BODY.torso };
}

/**
 * A hand spot relative to the shoulders: `dx` forward, `dy` down.
 * This is the easy way to control the elbows: a distance of 62 gives a straight arm, a shorter one a bent elbow.
 * Examples: `{ dx: 3, dy: 60 }` hangs beside the hip, `{ dx: 26, dy: -24 }` is in front of the face.
 */
export function handAt(hip: Spot2, lean: number, dx: number, dy: number): Spot2 {
  const shoulder = shoulderOf(hip, lean);
  return { x: shoulder.x + dx, y: shoulder.y + dy };
}

const RAD = Math.PI / 180;

/**
 * An arm from its two angles in the side view: the upper arm and the forearm.
 * 0 is down, 90 is forward, 180 is up, -90 is back.
 * Spread the result into a pose. It sets `hands` and `elbowTo`, and the elbow goes to this place.
 * Example with an upright torso: `armAt(hip, lean, 78, 240)` is a front rack with high elbows.
 * Example: `armAt(hip, lean, 0, 0)` hangs straight down.
 * Example: `armAt(hip, lean, 150, 20)` is a high pull with the elbows above the bar.
 * It is exact with the hands at the width of the shoulders (`grip: 13`), and near with another grip.
 */
export function armAt(
  hip: Spot2,
  lean: number,
  upper: number,
  fore: number,
): { hands: Spot2; elbowTo: number } {
  const shoulder = shoulderOf(hip, lean);
  const at = (angle: number, length: number) => ({
    x: Math.sin(angle * RAD) * length,
    y: Math.cos(angle * RAD) * length,
  });
  const elbow = at(upper, BODY.upperArm);
  const hand = at(fore, BODY.forearm);
  return {
    hands: { x: shoulder.x + elbow.x + hand.x, y: shoulder.y + elbow.y + hand.y },
    elbowTo: upper,
  };
}

/**
 * The front rack: a barbell on the shoulders, with high elbows.
 * Along the torso, the hands are 2 in front of the shoulder joints and 9.8 above them.
 * Thus the bar stays on the shoulders when the torso leans.
 * The elbows point forward and a little down, as high as the arm permits.
 * Spread the result into a pose.
 */
export function rackAt(hip: Spot2, lean: number): { hands: Spot2; elbowTo: number } {
  const shoulder = shoulderOf(hip, lean);
  const along = up(lean);
  return {
    hands: {
      x: shoulder.x + along.x * 9.8 - along.y * 2,
      y: shoulder.y + along.y * 9.8 + along.x * 2,
    },
    elbowTo: 80,
  };
}

/**
 * How high the hip of a standing figure is, so that the legs are exactly straight and the feet are on the ground.
 * With a wide stance, the ankle is outside the hip joint, and the hip is a little lower.
 */
export function standingHipY(stance = 8): number {
  return 200 - Math.sqrt(80 * 80 - (stance - BODY.hipHalf) ** 2);
}

/**
 * A figure that stands upright with its feet at x = 74. The arms hang straight beside the thighs
 * (`grip: 19`: with less, the arms are inside the torso in the front view). Spread it and change fields.
 */
export const STANDING: Pose = {
  hip: { x: 74, y: 120 },
  lean: 0,
  feet: { x: 74, y: 200 },
  grip: 19,
  hands: handAt({ x: 74, y: 120 }, 0, 2, 64),
};

/**
 * The bottom of a deep squat, feet at x = 74. The hip joint is 8 units below the knee joint, and the center of
 * mass is over the feet. The arms are straight and point forward as a counterweight: the hands are at x = 143,
 * outside the standard `SIDE` box.
 */
export const SQUAT: Pose = {
  hip: { x: 56, y: 174 },
  lean: 34,
  head: -20,
  feet: { x: 74, y: 200 },
  hands: handAt({ x: 56, y: 174 }, 34, 64, -7),
  stance: 12,
  knees: 0.35,
};
