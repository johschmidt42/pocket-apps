import { AmbientLight, DirectionalLight, type Scene } from "three";

/** The light of the game: one light from the top left, and some light from all sides. */
export function addLights(scene: Scene): void {
  const sun = new DirectionalLight("#ffffff", 2.2);
  sun.position.set(-0.6, 0.8, 1);
  scene.add(sun, new AmbientLight("#ffffff", 0.9));
}
