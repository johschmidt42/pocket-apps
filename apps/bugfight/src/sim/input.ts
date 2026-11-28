import type { WeaponName } from "../content/weapons.ts";

/** What the player wants in one tick. The sim does not know if it comes from the mouse or the keys. */
export type Input = {
  /** The move that the player wants for Seven in this tick, in field units. */
  moveX: number;
  moveY: number;
  /** Use the weapon that Seven carries: spray gas or shoot stones. */
  fire: boolean;
  /** Change to this weapon. `null` keeps the weapon. */
  weapon: WeaponName | null;
};

/** The input of a player that does nothing. */
export const NO_INPUT: Input = { moveX: 0, moveY: 0, fire: false, weapon: null };
