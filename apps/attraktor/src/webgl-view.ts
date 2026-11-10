import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Fog,
  HalfFloatType,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import type { SceneView } from "./attractor-scene.ts";
import type { Attractor } from "./attractors.ts";
import { fieldOfView } from "./camera.ts";
import { createShades, fillLineColors, type Palette } from "./palettes.ts";
import type { Simulation } from "./simulation.ts";

/** The picture is always dark, also in light mode. The lines add their light (like on zensical.org). */
const BACKGROUND = 0x0b0c0f;

/** A scene view on a canvas, with size changes and clean-up. */
export type StageView = SceneView & {
  /** Gives the lines the colors of this palette. */
  setPalette: (palette: Palette) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
};

/** Creates the graphics for a stage. `supported()` is false if the browser has no WebGL 2. */
export type ViewFactory = {
  supported: () => boolean;
  create: (
    container: HTMLElement,
    attractor: Attractor,
    lines: Simulation["lines"],
    random: () => number,
  ) => StageView;
};

function supportsWebGL(): boolean {
  const context = document.createElement("canvas").getContext("webgl2");
  if (context === null) return false;
  context.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}

/** Pairs of point indexes: each pair is one short segment of a line. */
function segmentIndex(lines: Simulation["lines"]): Uint32Array {
  const index = new Uint32Array(2 * lines.reduce((sum, line) => sum + line.length - 1, 0));
  let k = 0;
  for (const { start, length } of lines) {
    for (let i = start; i < start + length - 1; i++) {
      index[k++] = i;
      index[k++] = i + 1;
    }
  }
  return index;
}

function createView(
  container: HTMLElement,
  attractor: Attractor,
  lines: Simulation["lines"],
  random: () => number,
): StageView {
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);
  const pixelRatio = Math.min(window.devicePixelRatio, 2);

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);
  renderer.setClearColor(BACKGROUND);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.domElement.className = "block touch-none";
  container.append(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(BACKGROUND);
  scene.fog = new Fog(BACKGROUND, 1, 6);

  const target = new Vector3(...attractor.camera.target);
  const up = new Vector3(...attractor.camera.up);
  const fromTarget = new Vector3(...attractor.camera.position).sub(target);
  const camera = new PerspectiveCamera(fieldOfView(width / height), width / height, 0.001, 100);
  camera.up.copy(up);

  const positions = new Float32Array(3 * lines.reduce((sum, line) => sum + line.length, 0));
  const positionAttribute = new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", positionAttribute);
  const shades = createShades(lines.length, random);
  const colors = new Float32Array(4 * (positions.length / 3));
  const colorAttribute = new BufferAttribute(colors, 4);
  geometry.setAttribute("color", colorAttribute);
  geometry.setIndex(new BufferAttribute(segmentIndex(lines), 1));
  const material = new LineBasicMaterial({
    vertexColors: true,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const mesh = new LineSegments(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const renderTarget = new WebGLRenderTarget(width, height, { samples: 4, type: HalfFloatType });
  const composer = new EffectComposer(renderer, renderTarget);
  composer.setPixelRatio(pixelRatio);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(width, height), 0.5, 0.12, 0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const raycaster = new Raycaster();
  const pointer = new Vector2();

  return {
    setCameraAngle(angle) {
      camera.position.copy(fromTarget).applyAxisAngle(up, angle).add(target);
      camera.lookAt(target);
      camera.updateMatrixWorld();
    },
    rayAt(x, y) {
      raycaster.setFromCamera(pointer.set(x, y), camera);
      const { origin, direction } = raycaster.ray;
      return {
        origin: [origin.x, origin.y, origin.z],
        direction: [direction.x, direction.y, direction.z],
      };
    },
    setPalette(palette) {
      fillLineColors(colors, lines, shades, palette);
      colorAttribute.needsUpdate = true;
    },
    draw(points) {
      positions.set(points);
      positionAttribute.needsUpdate = true;
      composer.render();
    },
    resize(newWidth, newHeight) {
      const w = Math.max(newWidth, 1);
      const h = Math.max(newHeight, 1);
      camera.aspect = w / h;
      camera.fov = fieldOfView(w / h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}

export const webglViewFactory: ViewFactory = { supported: supportsWebGL, create: createView };
