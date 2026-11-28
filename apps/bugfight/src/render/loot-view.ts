import { Color, Group, Mesh, MeshBasicMaterial, SphereGeometry } from "three";
import { LOOT } from "../content/tuning.ts";
import type { Loot } from "../sim/state.ts";
import { outlineMaterial } from "./outline.ts";
import { LAYER } from "./stage.ts";

/** The pictures of the pollen that Seven collects: golden grains, alone or as a clump. */
export type LootView = {
  object: Group;
  update: (loot: Loot[], alpha: number, seconds: number) => void;
  dispose: () => void;
};

/** A clump has at most this number of grains. */
const MOST_GRAINS = 4;
/**
 * The places of the grains of a clump, for 1 to 4 grains. The unit is the radius of one grain.
 * The grains touch each other.
 */
const PLACES: [number, number][][] = [
  [[0, 0]],
  [
    [-0.85, 0],
    [0.85, 0],
  ],
  [
    [-0.85, -0.5],
    [0.85, -0.5],
    [0, 0.95],
  ],
  [
    [0, 1.15],
    [-1, 0],
    [1, 0],
    [0, -1.15],
  ],
];
/** A clump turns this number of times per second while it flies. */
const TURNS_PER_SECOND = 0.6;
/** A clump that lies still blinks this number of times per second, until it goes away. */
const BLINKS_PER_SECOND = 7;

export function createLootView(): LootView {
  const object = new Group();
  object.name = "loot";
  object.position.z = LAYER.shots;

  const ball = new SphereGeometry(1, 16, 12);
  // Gold that is a little brighter than white in its red part: the glow effect makes it shine softly.
  const gold = new MeshBasicMaterial({ color: new Color("#ffcf3a").multiplyScalar(1.7) });
  const shine = new MeshBasicMaterial({ color: "#fff6c4" });
  /** One picture per clump. The list grows when the sim has more clumps. */
  const pictures: { group: Group; grains: Group[] }[] = [];
  let time = 0;

  const create = () => {
    const group = new Group();
    const grains = Array.from({ length: MOST_GRAINS }, () => {
      const grain = new Group();
      const light = new Mesh(ball, shine);
      // A small light spot at the top left, where the light comes from.
      light.scale.setScalar(0.32);
      light.position.set(-0.35, 0.35, 0.8);
      grain.add(new Mesh(ball, gold), new Mesh(ball, outlineMaterial()), light);
      grain.scale.setScalar(LOOT.radius);
      group.add(grain);
      return grain;
    });
    object.add(group);
    const picture = { group, grains };
    pictures.push(picture);
    return picture;
  };

  return {
    object,
    update(loot, alpha, seconds) {
      time += seconds;
      while (pictures.length < loot.length) create();
      pictures.forEach(({ group, grains }, index) => {
        const clump = loot[index];
        if (clump === undefined) {
          group.visible = false;
          return;
        }
        const blinks = clump.restTicks > 0 && Math.floor(time * BLINKS_PER_SECOND * 2) % 2 === 1;
        group.visible = !blinks;
        group.position.set(
          clump.prevX + (clump.x - clump.prevX) * alpha,
          clump.prevY + (clump.y - clump.prevY) * alpha,
          0,
        );
        // Each clump starts at another angle.
        group.rotation.z = clump.restTicks > 0 ? 0 : time * TURNS_PER_SECOND * 2 * Math.PI + index;
        const places = PLACES[clump.grains - 1] ?? [];
        grains.forEach((grain, grainIndex) => {
          const place = places[grainIndex];
          grain.visible = place !== undefined;
          if (place !== undefined) {
            grain.position.set(place[0] * LOOT.radius, place[1] * LOOT.radius, 0);
          }
        });
      });
    },
    dispose() {
      ball.dispose();
      gold.dispose();
      shine.dispose();
    },
  };
}
