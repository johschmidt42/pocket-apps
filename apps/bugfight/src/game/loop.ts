/** What the game does for one picture. */
export type Frame = {
  /** The number of ticks that the sim makes before this picture. */
  ticks: number;
  /** How far the time is between the last tick (0) and the next one (1). The picture uses it to move smoothly. */
  alpha: number;
  /** The game time that passed since the last picture, in seconds. Cosmetic things move by it. */
  seconds: number;
};

/** Turns the real time between two pictures into ticks of a fixed length. */
export type Loop = {
  /** Call once per picture with the real seconds since the last picture. */
  advance: (realSeconds: number) => Frame;
  /** 1 is normal speed, 0.25 is slow motion, 0 holds the game. */
  setTimeFactor: (factor: number) => void;
  timeFactor: () => number;
  /** Holds the game for this real time. Use it for the moment of a big hit. */
  hitStop: (seconds: number) => void;
};

/** A longer gap between two pictures (for example after a tab change) counts only as this time. */
const LONGEST_FRAME_SECONDS = 0.1;

/** Guards the division against rounding errors: 0.1 / (1 / 120) must be 12 ticks, not 11. */
const EPSILON = 1e-9;

export function createLoop(tickSeconds: number): Loop {
  let waiting = 0;
  let factor = 1;
  let stop = 0;
  return {
    advance(realSeconds) {
      let seconds = Math.min(Math.max(realSeconds, 0), LONGEST_FRAME_SECONDS);
      const held = Math.min(stop, seconds);
      stop -= held;
      seconds -= held;
      seconds *= factor;
      waiting += seconds;
      const ticks = Math.floor(waiting / tickSeconds + EPSILON);
      waiting = Math.max(waiting - ticks * tickSeconds, 0);
      return { ticks, alpha: waiting / tickSeconds, seconds };
    },
    setTimeFactor(next) {
      factor = Math.max(next, 0);
    },
    timeFactor: () => factor,
    hitStop(seconds) {
      stop = Math.max(stop, seconds);
    },
  };
}
