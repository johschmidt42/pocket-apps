import { Color } from "three";
import type { SimEvent } from "../sim/events.ts";
import type { GameState } from "../sim/state.ts";
import { createParticles, type Burst, type Particles } from "./particles.ts";
import { GLOW } from "./stage.ts";

/** The effects of the picture for the events of the sim: particles and the screen shake. */
export type Effects = {
  particles: Particles;
  /** Starts the effects of these events and moves all effects on by this time. */
  update: (state: GameState, events: SimEvent[], seconds: number) => void;
  /** The move of the camera for the screen shake, in field units. */
  shake: () => { x: number; y: number };
  reset: () => void;
  dispose: () => void;
};

const glow = (hex: string) => new Color(hex).multiplyScalar(GLOW);

/** The splinters of a dead ant, in the colors of its body. They fall. */
const ANT_SPLINTERS: Burst = {
  count: 12,
  colors: [new Color("#b04a2b"), new Color("#7d2f1c"), new Color("#3a1a12")],
  slowest: 120,
  fastest: 420,
  size: 6,
  seconds: 0.55,
  fall: 700,
};
/** The bright flash of a death. */
const DEATH_SPARKS: Burst = {
  count: 9,
  colors: [glow("#fff3b0"), glow("#ffd36b")],
  slowest: 200,
  fastest: 620,
  size: 5,
  seconds: 0.3,
};
/** Some sparks where a weapon hurts an enemy. */
const HIT_SPARKS: Burst = {
  count: 3,
  colors: [glow("#fff7d1")],
  slowest: 80,
  fastest: 260,
  size: 3.5,
  seconds: 0.2,
};
/** Seven loses a spot: red and black bits, and bright sparks. */
const PLAYER_BITS: Burst = {
  count: 16,
  colors: [new Color("#e0241b"), new Color("#1b1b22"), glow("#ffb3a8")],
  slowest: 150,
  fastest: 560,
  size: 6,
  seconds: 0.5,
  fall: 300,
};
/** The flash at the end of the barrel. */
const MUZZLE_FLASH: Burst = {
  count: 4,
  colors: [glow("#ffe9a8")],
  slowest: 60,
  fastest: 240,
  size: 5,
  seconds: 0.09,
};

/** The trauma of the screen: 0 is calm, 1 is the strongest shake. An event adds to it, and time takes from it. */
const TRAUMA = { enemyDied: 0.14, playerHit: 0.65, playerDied: 1 };
const TRAUMA_PER_SECOND = 1.7;
/** The longest move of the camera, in field units. */
const SHAKE_UNITS = 16;
/** The end of the barrel, in front of the center of Seven. */
const MUZZLE_Y = 46;

export function createEffects(seed: number): Effects {
  const particles = createParticles(seed);
  let trauma = 0;
  let time = 0;

  return {
    particles,
    update(state, events, seconds) {
      const { player } = state;
      for (const event of events) {
        switch (event.type) {
          case "enemy-died":
            particles.burst(event.x, event.y, ANT_SPLINTERS);
            particles.burst(event.x, event.y, DEATH_SPARKS);
            trauma += TRAUMA.enemyDied;
            break;
          case "enemy-hit": {
            const enemy = state.enemies.find((candidate) => candidate.id === event.id);
            if (enemy !== undefined) particles.burst(enemy.x, enemy.y, HIT_SPARKS);
            break;
          }
          case "player-hit":
            particles.burst(player.x, player.y, PLAYER_BITS);
            trauma += TRAUMA.playerHit;
            break;
          case "player-died":
            particles.burst(player.x, player.y, { ...PLAYER_BITS, count: 40, fastest: 800 });
            trauma += TRAUMA.playerDied;
            break;
          case "seed-shot":
            particles.burst(player.x, player.y + MUZZLE_Y, MUZZLE_FLASH);
            break;
          case "tank-empty":
          case "drum-empty":
          case "wave-cleared":
            break;
        }
      }
      trauma = Math.max(Math.min(trauma, 1) - TRAUMA_PER_SECOND * seconds, 0);
      time += seconds;
      particles.update(seconds);
    },
    shake() {
      // The square makes a small trauma nearly calm and a large one strong.
      const reach = trauma * trauma * SHAKE_UNITS;
      return { x: Math.sin(time * 61) * reach, y: Math.sin(time * 53 + 1.3) * reach };
    },
    reset() {
      trauma = 0;
      particles.reset();
    },
    dispose: particles.dispose,
  };
}
