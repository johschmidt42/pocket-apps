import { Group } from "three";
import { ant } from "../models/ant.ts";
import { clamp } from "../models/pose.ts";
import type { SimEvent } from "../sim/events.ts";
import { TICKS_PER_SECOND } from "../sim/field.ts";
import type { Enemy, GameState } from "../sim/state.ts";
import { createFigureView, type FigureView } from "./figure-view.ts";

/** The pictures of all enemies. */
export type EnemiesView = {
  object: Group;
  update: (state: GameState, alpha: number, seconds: number, events: SimEvent[]) => void;
  /** Removes all pictures. For a new game. */
  reset: () => void;
  dispose: () => void;
};

/** The motion of the figure for each state of the sim. A waiting enemy has no picture. */
const MOTION = { waiting: "hover", entering: "enter", formation: "hover", spitting: "spit" };
/** The motion "spit" can start in this number of ticks after the sim began the spit. */
const SPIT_START_TICKS = 30;
/** The length of the motion "death" of the ant. */
const DEATH_SECONDS = 0.5;
/** At this speed to the side (field units per second), an ant leans fully. */
const FULL_LEAN_SPEED = 500;
/** An ant looks straight at a player that is this far away, and to the side at a nearer one. */
const LOOK_DISTANCE = 350;

export function createEnemiesView(): EnemiesView {
  const object = new Group();
  const alive = new Map<number, FigureView>();
  /** The figures of dead enemies. They play their death and go away. */
  let dying: { figure: FigureView; seconds: number }[] = [];

  const remove = (figure: FigureView) => {
    object.remove(figure.object);
    figure.dispose();
  };
  const figureOf = (enemy: Enemy): FigureView => {
    let figure = alive.get(enemy.id);
    if (figure === undefined) {
      // Each ant starts at another moment of its motion. Thus the wings do not all beat together.
      figure = createFigureView(ant, enemy.id * 0.37);
      alive.set(enemy.id, figure);
      object.add(figure.object);
    }
    return figure;
  };
  const place = (figure: FigureView, x: number, y: number, id: number) => {
    // The pose can move the figure a little. The place of the sim comes on top of it.
    figure.object.position.x += x;
    figure.object.position.y += y;
    // Two ants never have the same distance to the camera. Thus they cover each other in a clear order.
    figure.object.position.z = id * 0.5;
  };

  return {
    object,
    update(state, alpha, seconds, events) {
      const hit = new Set<number>();
      for (const event of events) {
        if (event.type === "enemy-hit") hit.add(event.id);
        if (event.type !== "enemy-died") continue;
        const figure = alive.get(event.id);
        if (figure === undefined) continue;
        alive.delete(event.id);
        figure.play("death");
        dying.push({ figure, seconds: 0 });
      }

      for (const enemy of state.enemies) {
        if (enemy.state === "waiting") continue;
        const figure = figureOf(enemy);
        const wanted = MOTION[enemy.state];
        const now = figure.motion();
        if (wanted === "spit") {
          // Only at the start of the spit. Else a late picture starts the motion a second time.
          if (now !== "spit" && enemy.stateTicks < SPIT_START_TICKS) figure.play("spit");
        } else if (hit.has(enemy.id)) {
          if (now !== "hit") figure.play("hit");
        } else if (now !== wanted && now !== "hit") {
          figure.play(wanted);
        }
        const speedX = (enemy.x - enemy.prevX) * TICKS_PER_SECOND;
        figure.update(seconds, {
          lean: [clamp(speedX / FULL_LEAN_SPEED, -1, 1), 0],
          look: [
            clamp((state.player.x - enemy.x) / LOOK_DISTANCE, -1, 1),
            clamp((state.player.y - enemy.y) / LOOK_DISTANCE, -1, 1),
          ],
          spots: 0,
        });
        place(
          figure,
          enemy.prevX + (enemy.x - enemy.prevX) * alpha,
          enemy.prevY + (enemy.y - enemy.prevY) * alpha,
          enemy.id,
        );
      }

      dying = dying.filter((entry) => {
        entry.seconds += seconds;
        if (entry.seconds >= DEATH_SECONDS) {
          remove(entry.figure);
          return false;
        }
        // The figure stays where it died.
        const { x, y, z } = entry.figure.object.position;
        entry.figure.update(seconds, { lean: [0, 0], look: [0, 0], spots: 0 });
        entry.figure.object.position.set(x, y, z);
        return true;
      });
    },
    reset() {
      for (const figure of alive.values()) remove(figure);
      alive.clear();
      for (const entry of dying) remove(entry.figure);
      dying = [];
    },
    dispose() {
      for (const figure of alive.values()) figure.dispose();
      for (const entry of dying) entry.figure.dispose();
    },
  };
}
