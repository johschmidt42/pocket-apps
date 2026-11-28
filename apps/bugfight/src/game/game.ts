import { levelOf } from "../content/tuning.ts";
import { FIRST_WAVE } from "../content/waves.ts";
import type { WeaponName } from "../content/weapons.ts";
import type { View } from "../render/view.ts";
import { createBot } from "../sim/bot.ts";
import type { SimEvent } from "../sim/events.ts";
import { TICK_SECONDS } from "../sim/field.ts";
import { NO_INPUT } from "../sim/input.ts";
import { createState } from "../sim/state.ts";
import { step } from "../sim/step.ts";
import { createControls, type PointerMode } from "./controls.ts";
import { nextScreen, type FlowEvent, type Screen } from "./flow.ts";
import { createLoop } from "./loop.ts";

/** Numbers for the debug panel. */
export type Stats = {
  picturesPerSecond: number;
  tick: number;
  x: number;
  y: number;
  pointer: PointerMode;
  /** The numbers of objects in the sim. */
  puffs: number;
  enemies: number;
  drops: number;
};

/** What the displays of the game show. */
export type Hud = {
  /** The pressure of the tank in percent, from 0 to 100. */
  pressure: number;
  /** True while the spray is locked after an empty tank. */
  tankLocked: boolean;
  /** The spots that Seven has left. */
  spots: number;
  /** The level of the fire power. */
  level: number;
  /** The weapon that Seven carries. */
  weapon: WeaponName;
  /** The stones in the drum of the "Kernspucker". */
  seeds: number;
  /** True while the "Kernspucker" is locked after an empty drum. */
  drumLocked: boolean;
  /** The grains of pollen that Seven collected. */
  score: number;
};

/** What the user interface shows. The object is new after each change. */
export type GameInfo = {
  screen: Screen;
  debug: boolean;
  hitAreas: boolean;
  /** Debug: nothing can hurt Seven. */
  immortal: boolean;
  timeFactor: number;
  hud: Hud;
  stats: Stats;
};

/** The running game: the sim, the picture, the controls and the loop. */
export type Game = {
  subscribe: (listener: () => void) => () => void;
  info: () => GameInfo;
  /** Start, again and resume ask for the pointer lock. Call them in a click. */
  start: () => void;
  /** Starts a new game after a game that is over. */
  again: () => void;
  resume: () => void;
  /** Ends the game and shows the title. */
  quit: () => void;
  toggleDebug: () => void;
  setHitAreas: (visible: boolean) => void;
  setTimeFactor: (factor: number) => void;
  /** Debug: sets the level of the fire power. */
  setLevel: (level: number) => void;
  /** Debug: nothing can hurt Seven. */
  setImmortal: (immortal: boolean) => void;
  /** Makes one tick with no input. Only in the pause. */
  singleTick: () => void;
  dispose: () => void;
};

/** Options for tests and for the developer. The address of the page can set them, see `readOptions()`. */
export type GameOptions = {
  /** Open the debug panel at the start. */
  debug?: boolean;
  /** Show the hit areas at the start. */
  hitAreas?: boolean;
  /** The level of the fire power at the start. */
  level?: number;
  /** The weapon at the start. */
  weapon?: WeaponName;
  /** The number of spots at the start of each game. */
  spots?: number;
  /** The bot plays in place of the player. */
  bot?: boolean;
  /**
   * The number of rows of the wave, from 1 to the rows of the full wave. A small wave is much less
   * work for a computer with no graphics card. The browser tests use it.
   */
  rows?: number;
};

/** The debug panel gets new numbers after this time. */
const STATS_SECONDS = 0.25;
/** While no game runs, the garden moves on. A long gap between two pictures counts only as this time. */
const LONGEST_FRAME_SECONDS = 0.1;
/** The game stands still for this real time after a hit of Seven. The moment gets weight. */
const HIT_STOP_SECONDS = { hit: 0.08, died: 0.16 };
/**
 * After the last enemy, the game runs in slow motion: for `holdSeconds` of real time with `factor`,
 * then it returns to the normal speed in `returnSeconds`.
 */
const SLOW_MOTION = { holdSeconds: 0.9, returnSeconds: 0.9, factor: 0.12 };
/** After the end of a game, the sim runs on for this time. Thus the player sees the last motion of Seven. */
const END_SECONDS = { won: 1.7, lost: 1.5 };

/** The number of an option of the address. An option that is missing, empty or no number gives `undefined`. */
function numberOf(query: URLSearchParams, name: string): number | undefined {
  const text = query.get(name);
  if (text === null || text.trim() === "") return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

/** Reads the options from the address: `?debug`, `?hit`, `?level=5`, `?weapon=spray`, `?spots=1`, `?rows=1`, `?bot`. */
export function readOptions(search: string): GameOptions {
  const query = new URLSearchParams(search);
  const options: GameOptions = {
    debug: query.has("debug"),
    hitAreas: query.has("hit"),
    bot: query.has("bot"),
  };
  const level = numberOf(query, "level");
  if (level !== undefined) options.level = level;
  const rows = numberOf(query, "rows");
  if (rows !== undefined) options.rows = rows;
  const spots = numberOf(query, "spots");
  if (spots !== undefined) options.spots = spots;
  const weapon = query.get("weapon");
  if (weapon === "spray" || weapon === "seeds") options.weapon = weapon;
  return options;
}

/** Starts the picture loop. `createView` makes the picture in `container`. Tests give a fake. */
export function createGame(
  container: HTMLElement,
  options: GameOptions,
  createView: (container: HTMLElement) => View,
): Game {
  const view = createView(container);
  /** Each game has another seed. Thus the ants spit at other moments. */
  let games = 1;
  const wave =
    options.rows === undefined
      ? FIRST_WAVE
      : {
          ...FIRST_WAVE,
          rows: Math.min(Math.max(Math.round(options.rows), 1), FIRST_WAVE.rows),
        };
  const state = createState(games, wave);
  state.player.level = levelOf(options.level ?? 1);
  if (options.spots !== undefined) state.player.spots = options.spots;
  if (options.weapon !== undefined) state.player.weapon = options.weapon;
  const bot = createBot();
  const loop = createLoop(TICK_SECONDS);
  const listeners = new Set<() => void>();

  let screen: Screen = "title";
  let debug = options.debug ?? false;
  let hitAreas = options.hitAreas ?? false;
  let picturesPerSecond = 0;
  /** The game time since the game is over. */
  let endSeconds = 0;
  /** The time factor of the debug panel. */
  let debugFactor = 1;
  /** The real seconds of slow motion that are left. */
  let slowSeconds = 0;
  /** The picture shows the newest tick until the next game starts to run. */
  let alpha = 1;

  const controls = createControls(view.canvas, () => {
    if (change("pause")) controls.release();
  });

  const readHud = (): Hud => ({
    pressure: Math.round(state.player.pressure * 100),
    tankLocked: state.player.tankLocked,
    spots: state.player.spots,
    level: state.player.level,
    weapon: state.player.weapon,
    seeds: state.player.seeds,
    drumLocked: state.player.drumLocked,
    score: state.score,
  });
  const readInfo = (): GameInfo => ({
    screen,
    debug,
    hitAreas,
    immortal: state.player.immortal,
    timeFactor: debugFactor,
    hud: readHud(),
    stats: {
      picturesPerSecond,
      tick: state.tick,
      x: state.player.x,
      y: state.player.y,
      pointer: controls.pointer(),
      puffs: state.puffs.length,
      enemies: state.enemies.length,
      drops: state.drops.length,
    },
  });
  let info = readInfo();
  const publish = () => {
    info = readInfo();
    container.dataset.screen = screen;
    for (const listener of listeners) listener();
  };
  /** Tells the user interface when a display has a new value. */
  const publishHud = () => {
    // The displays are a few numbers. The text of the two objects says if one of them changed.
    if (JSON.stringify(readHud()) !== JSON.stringify(info.hud)) publish();
  };
  /** Returns true if the event changed the screen. */
  function change(event: FlowEvent): boolean {
    const next = nextScreen(screen, event);
    if (next === screen) return false;
    screen = next;
    publish();
    return true;
  }
  /** Puts the sim and the picture back to the start. The options of the debug panel stay. */
  const newGame = () => {
    const { level, immortal, weapon } = state.player;
    games += 1;
    Object.assign(state, createState(games, wave));
    if (options.spots !== undefined) state.player.spots = options.spots;
    state.player.level = level;
    state.player.immortal = immortal;
    state.player.weapon = weapon;
    view.reset();
    endSeconds = 0;
    slowSeconds = 0;
    alpha = 1;
  };
  const update = (seconds: number, events: SimEvent[]) => {
    view.update(state, { seconds, alpha, events, hitAreas });
  };

  let handle = 0;
  let last = performance.now();
  let statSeconds = 0;
  let statPictures = 0;
  const picture = (now: number) => {
    const real = Math.max(now - last, 0) / 1000;
    last = now;
    let seconds = 0;
    const events: SimEvent[] = [];
    if (screen === "playing") {
      // The slow motion holds its factor first. Then it goes back to the normal speed.
      slowSeconds = Math.max(slowSeconds - real, 0);
      const slow = Math.min(slowSeconds / SLOW_MOTION.returnSeconds, 1);
      loop.setTimeFactor(debugFactor * (1 - (1 - SLOW_MOTION.factor) * slow * slow));
      const frame = loop.advance(real);
      for (let tick = 0; tick < frame.ticks; tick++) {
        const input = controls.read(state.player.x, state.player.y);
        events.push(...step(state, options.bot === true ? bot(state) : input));
      }
      for (const event of events) {
        if (event.type === "player-hit") loop.hitStop(HIT_STOP_SECONDS.hit);
        if (event.type === "player-died") loop.hitStop(HIT_STOP_SECONDS.died);
        if (event.type === "wave-cleared") {
          slowSeconds = SLOW_MOTION.holdSeconds + SLOW_MOTION.returnSeconds;
        }
      }
      seconds = frame.seconds;
      alpha = frame.alpha;
      publishHud();
      if (state.over !== null) {
        endSeconds += seconds;
        if (endSeconds >= END_SECONDS[state.over]) {
          change(state.over === "won" ? "win" : "lose");
          controls.release();
        }
      }
    } else if (screen !== "paused") {
      seconds = Math.min(real, LONGEST_FRAME_SECONDS);
    }
    update(seconds, events);
    view.draw();

    statSeconds += real;
    statPictures += 1;
    if (statSeconds >= STATS_SECONDS) {
      picturesPerSecond = Math.round(statPictures / statSeconds);
      statSeconds = 0;
      statPictures = 0;
      if (debug) publish();
    }
    handle = requestAnimationFrame(picture);
  };

  container.dataset.screen = screen;
  handle = requestAnimationFrame(picture);

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    info: () => info,
    start() {
      if (change("start")) controls.lock();
    },
    again() {
      if (nextScreen(screen, "again") === screen) return;
      newGame();
      change("again");
      controls.lock();
    },
    resume() {
      if (change("resume")) controls.lock();
    },
    quit() {
      if (nextScreen(screen, "quit") === screen) return;
      newGame();
      change("quit");
    },
    toggleDebug() {
      debug = !debug;
      publish();
    },
    setHitAreas(visible) {
      hitAreas = visible;
      publish();
    },
    setTimeFactor(factor) {
      debugFactor = Math.max(factor, 0);
      publish();
    },
    setLevel(level) {
      state.player.level = levelOf(level);
      publish();
    },
    setImmortal(immortal) {
      state.player.immortal = immortal;
      publish();
    },
    singleTick() {
      if (screen !== "paused") return;
      alpha = 1;
      update(TICK_SECONDS, step(state, NO_INPUT));
      view.draw();
      publish();
    },
    dispose() {
      cancelAnimationFrame(handle);
      listeners.clear();
      controls.dispose();
      view.dispose();
      delete container.dataset.screen;
    },
  };
}
