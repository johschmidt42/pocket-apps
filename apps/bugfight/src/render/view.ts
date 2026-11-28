import { supportsWebGL2 } from "@pocket-apps/core/webgl";
import type { SimEvent } from "../sim/events.ts";
import type { GameState } from "../sim/state.ts";
import { createBackground } from "./background.ts";
import { createDebugOverlay } from "./debug-overlay.ts";
import { createDropsView } from "./drops-view.ts";
import { createEffects } from "./effects.ts";
import { createEnemiesView } from "./enemies-view.ts";
import { createGasView } from "./gas-view.ts";
import { addLights } from "./lights.ts";
import { createPlayerView } from "./player-view.ts";
import { createSeedsView } from "./seeds-view.ts";
import { createStage } from "./stage.ts";

/** What the picture needs for one update, in addition to the state of the sim. */
export type Moment = {
  /** The game time since the last update, in seconds. It moves the cosmetic things. */
  seconds: number;
  /** How far the time is between the last tick (0) and the next one (1). */
  alpha: number;
  /** What happened in the ticks since the last update. */
  events: SimEvent[];
  /** Show the hit areas and the limits of the field. */
  hitAreas: boolean;
};

/** The picture of the game. It reads the state of the sim and never changes it. */
export type View = {
  /** The element that shows the field. The controls measure the mouse on it. */
  canvas: HTMLCanvasElement;
  /** Takes the state of the sim and moves the cosmetic things. */
  update: (state: GameState, moment: Moment) => void;
  /** Draws one picture of what the last `update` gave. */
  draw: () => void;
  /** Forgets the last game. Call it when a new game starts. */
  reset: () => void;
  dispose: () => void;
};

/** The seed of the cosmetic random numbers. A fixed seed gives the same garden each time. */
const COSMETIC_SEED = 7;

function createView(container: HTMLElement): View {
  const stage = createStage(container);

  addLights(stage.scene);

  const background = createBackground(COSMETIC_SEED);
  // The garden is a little larger than the field. Thus the screen shake does not show its edge.
  background.object.scale.setScalar(1.05);
  const effects = createEffects(COSMETIC_SEED + 1);
  const gas = createGasView();
  const enemies = createEnemiesView();
  const drops = createDropsView();
  const seeds = createSeedsView();
  const player = createPlayerView();
  const debug = createDebugOverlay();
  stage.scene.add(
    background.object,
    gas.object,
    enemies.object,
    drops.object,
    seeds.object,
    effects.particles.object,
    player.object,
    debug.object,
  );

  return {
    canvas: stage.canvas,
    update(state, moment) {
      background.update(moment.seconds);
      gas.update(state.puffs, moment.alpha, moment.seconds);
      enemies.update(state, moment.alpha, moment.seconds, moment.events);
      drops.update(state.drops, moment.alpha);
      seeds.update(state.seeds, moment.alpha);
      player.update(state.player, moment.seconds, moment.events);
      effects.update(state, moment.events, moment.seconds);
      const shake = effects.shake();
      stage.setCameraOffset(shake.x, shake.y);
      debug.update(state, moment.hitAreas);
    },
    draw: stage.render,
    reset() {
      enemies.reset();
      player.reset();
      effects.reset();
    },
    dispose() {
      background.dispose();
      gas.dispose();
      enemies.dispose();
      drops.dispose();
      seeds.dispose();
      effects.dispose();
      player.dispose();
      debug.dispose();
      stage.dispose();
    },
  };
}

/** Makes the picture. Tests give a fake, because jsdom has no WebGL. */
export type ViewFactory = {
  /** False if the browser has no WebGL 2. Then the app shows a message. */
  supported: () => boolean;
  create: (container: HTMLElement) => View;
};

export const webglViewFactory: ViewFactory = { supported: supportsWebGL2, create: createView };
