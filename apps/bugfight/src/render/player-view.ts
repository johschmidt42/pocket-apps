import type { Group } from "three";
import { clamp } from "../models/pose.ts";
import { seven } from "../models/seven.ts";
import type { SimEvent } from "../sim/events.ts";
import type { Player } from "../sim/state.ts";
import { createFigureView } from "./figure-view.ts";
import { LAYER } from "./stage.ts";

/** The picture of Seven in the game. */
export type PlayerView = {
  object: Group;
  /** Shows Seven as the sim has him. `seconds` is the time since the last picture. */
  update: (player: Player, seconds: number, events: SimEvent[]) => void;
  /** Shows Seven as at the start. For a new game. */
  reset: () => void;
  dispose: () => void;
};

/** At this speed (field units per second), Seven leans fully. */
const FULL_LEAN_SPEED = 1500;
/** How fast the lean follows the speed. A higher number is faster. */
const LEAN_RATE = 11;
/** The length of the motion "death" of Seven. After it, Seven is gone. */
const DEATH_SECONDS = 1.15;
/** While nothing can hurt Seven after a hit, he blinks this number of times per second. */
const BLINKS_PER_SECOND = 9;
/** These motions run to their end. The flight does not replace them. */
const ONCE = ["empty", "shoot", "reload", "hit", "death", "win"];

/** Seven in the game: the figure, at the place that the sim gives, with a lean that follows his speed. */
export function createPlayerView(): PlayerView {
  const figure = createFigureView(seven);
  figure.object.position.z = LAYER.player;

  let lastX: number | undefined;
  let lastY = 0;
  let speedX = 0;
  let speedY = 0;
  let time = 0;
  /** The seconds since Seven died, or `null` while he lives. */
  let dead: number | null = null;

  return {
    object: figure.object,
    update(player, seconds, events) {
      const { x, y } = player;
      time += seconds;
      if (lastX !== undefined && seconds > 0) {
        const follow = 1 - Math.exp(-seconds * LEAN_RATE);
        speedX += ((x - lastX) / seconds - speedX) * follow;
        speedY += ((y - lastY) / seconds - speedY) * follow;
      }
      lastX = x;
      lastY = y;

      // The motion follows the sim. A motion that happens once runs to its end first.
      for (const event of events) {
        if (event.type === "tank-empty") figure.play("empty");
        // The kick of a shot does not stop the motion of a hit.
        if (event.type === "seed-shot" && figure.motion() !== "hit") figure.play("shoot");
        if (event.type === "drum-empty") figure.play("reload");
        if (event.type === "player-hit") figure.play("hit");
        if (event.type === "wave-cleared") figure.play("win");
        if (event.type === "player-died") {
          figure.play("death");
          dead = 0;
        }
      }
      const wanted = player.spraying ? "spray" : "hover";
      if (!ONCE.includes(figure.motion()) && figure.motion() !== wanted) figure.play(wanted);

      figure.update(seconds, {
        lean: [clamp(speedX / FULL_LEAN_SPEED, -1, 1), clamp(speedY / FULL_LEAN_SPEED, -1, 1)],
        look: [0, 0],
        spots: player.spots,
        weapon: player.weapon,
        ammo: player.seeds,
      });
      // The pose can move the figure a little. The place of the sim comes on top of it.
      figure.object.position.x += x;
      figure.object.position.y += y;
      figure.object.position.z = LAYER.player;

      if (dead !== null) {
        dead += seconds;
        figure.object.visible = dead < DEATH_SECONDS;
      } else {
        // After the motion of the hit, Seven blinks until he can take damage again.
        const blinks = player.safeTicks > 0 && figure.motion() !== "hit";
        figure.object.visible = !blinks || Math.floor(time * BLINKS_PER_SECOND * 2) % 2 === 0;
      }
    },
    reset() {
      dead = null;
      lastX = undefined;
      speedX = 0;
      speedY = 0;
      figure.object.visible = true;
      figure.play("hover");
    },
    dispose: figure.dispose,
  };
}
