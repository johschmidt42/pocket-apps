import { Group, Mesh, MeshBasicMaterial, SphereGeometry } from "three";
import type { Seed } from "../sim/state.ts";
import { outlineMaterial } from "./outline.ts";
import { LAYER } from "./stage.ts";

/** The pictures of the cherry stones that Seven shoots. */
export type SeedsView = {
  object: Group;
  update: (seeds: Seed[], alpha: number) => void;
  dispose: () => void;
};

export function createSeedsView(): SeedsView {
  const object = new Group();
  object.name = "seeds";
  object.position.z = LAYER.shots;

  const ball = new SphereGeometry(1, 14, 10);
  const stone = new MeshBasicMaterial({ color: "#f3d39a" });
  /** One picture per stone. The list grows when the sim has more stones. */
  const pictures: Group[] = [];

  const create = (): Group => {
    const picture = new Group();
    picture.add(new Mesh(ball, stone), new Mesh(ball, outlineMaterial()));
    object.add(picture);
    return picture;
  };

  return {
    object,
    update(seeds, alpha) {
      while (pictures.length < seeds.length) pictures.push(create());
      pictures.forEach((picture, index) => {
        const seed = seeds[index];
        picture.visible = seed !== undefined;
        if (seed === undefined) return;
        picture.position.set(
          seed.prevX + (seed.x - seed.prevX) * alpha,
          seed.prevY + (seed.y - seed.prevY) * alpha,
          0,
        );
        // A stone is longer than it is wide, in the direction of its flight.
        picture.scale.set(seed.radius * 0.8, seed.radius * 1.5, seed.radius * 0.8);
      });
    },
    dispose() {
      ball.dispose();
      stone.dispose();
    },
  };
}
