import {
  HalfFloatType,
  OrthographicCamera,
  Scene,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { FIELD } from "../sim/field.ts";

/** The canvas, the camera and the scene. The picture always has the shape of the field (16:9). */
export type Stage = {
  scene: Scene;
  canvas: HTMLCanvasElement;
  /** Moves the camera away from the center of the field, in field units. For the screen shake. */
  setCameraOffset: (x: number, y: number) => void;
  render: () => void;
  dispose: () => void;
};

/** The distances of the layers from the camera. A higher z is nearer to the camera. */
export const LAYER = {
  background: -500,
  vignette: -300,
  dust: -200,
  /** The gas of Seven is behind the enemies (at 0), so that it never hides an enemy or a shot. */
  gas: -100,
  /** Enemy shots are in front of the enemies (at 0) and of the gas. */
  shots: 200,
  /** Sparks and splinters are in front of the shots. */
  particles: 250,
  /** Seven is always in front of all other objects. */
  player: 300,
  debug: 600,
};

/**
 * A color with this factor is brighter than white. Only such colors glow.
 * Use it for enemy shots, sparks and flashes: `new Color(hex).multiplyScalar(GLOW)`.
 */
export const GLOW = 3;

/**
 * Puts a canvas into `container` and keeps it as large as possible with the shape of the field.
 * The camera has no perspective and looks straight at the field: one field unit has the same size at each place.
 * After the picture, a glow effect (bloom) adds light around all that is brighter than white.
 */
export function createStage(container: HTMLElement): Stage {
  const renderer = new WebGLRenderer({ antialias: true });
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  const canvas = renderer.domElement;
  container.append(canvas);

  const scene = new Scene();
  const camera = new OrthographicCamera(
    -FIELD.width / 2,
    FIELD.width / 2,
    FIELD.height / 2,
    -FIELD.height / 2,
    1,
    2000,
  );
  camera.position.z = 1000;

  // The picture keeps values over 1 (brighter than white) until the glow effect used them.
  const target = new WebGLRenderTarget(1, 1, { samples: 4, type: HalfFloatType });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(pixelRatio);
  composer.addPass(new RenderPass(scene, camera));
  // Strength 0.55, radius 0.5, and only colors over 1 glow.
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.55, 0.5, 1);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const fit = () => {
    const scale = Math.min(
      container.clientWidth / FIELD.width,
      container.clientHeight / FIELD.height,
    );
    const width = Math.max(Math.floor(FIELD.width * scale), 1);
    const height = Math.max(Math.floor(FIELD.height * scale), 1);
    renderer.setSize(width, height);
    composer.setSize(width, height);
  };
  const observer = new ResizeObserver(fit);
  observer.observe(container);
  fit();

  return {
    scene,
    canvas,
    setCameraOffset(x, y) {
      camera.position.x = x;
      camera.position.y = y;
    },
    render: () => {
      composer.render();
    },
    dispose() {
      observer.disconnect();
      bloom.dispose();
      composer.dispose();
      target.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
