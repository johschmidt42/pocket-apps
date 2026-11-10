import type * as Three from "three";
import type { BufferAttribute, LineSegments, PerspectiveCamera, Scene } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ATTRACTORS } from "./attractors.ts";
import { findPalette } from "./palettes.ts";
import { seededRandom } from "./seeded-random.ts";
import { webglViewFactory } from "./webgl-view.ts";

// jsdom has no WebGL. These fakes replace only the parts that talk to the GPU:
// the renderer and the post-processing chain. Camera, ray and geometry are real three.js.
const gpu = vi.hoisted(() => ({
  renderers: [] as {
    domElement: HTMLCanvasElement;
    setSize: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    forceContextLoss: ReturnType<typeof vi.fn>;
  }[],
  composers: [] as {
    render: ReturnType<typeof vi.fn>;
    setSize: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }[],
  renderPasses: [] as { scene: unknown; camera: unknown }[],
}));

vi.mock("three", async (importOriginal) => ({
  ...(await importOriginal<typeof Three>()),
  WebGLRenderer: class {
    domElement = document.createElement("canvas");
    toneMapping = 0;
    toneMappingExposure = 1;
    setPixelRatio = vi.fn();
    setSize = vi.fn();
    setClearColor = vi.fn();
    dispose = vi.fn();
    forceContextLoss = vi.fn();
    constructor() {
      gpu.renderers.push(this);
    }
  },
  WebGLRenderTarget: class {
    readonly fake = true;
  },
}));
vi.mock("three/addons/postprocessing/EffectComposer.js", () => ({
  EffectComposer: class {
    setPixelRatio = vi.fn();
    addPass = vi.fn();
    render = vi.fn();
    setSize = vi.fn();
    dispose = vi.fn();
    constructor() {
      gpu.composers.push(this);
    }
  },
}));
vi.mock("three/addons/postprocessing/RenderPass.js", () => ({
  RenderPass: class {
    readonly fake = true;
    constructor(scene: unknown, camera: unknown) {
      gpu.renderPasses.push({ scene, camera });
    }
  },
}));
vi.mock("three/addons/postprocessing/UnrealBloomPass.js", () => ({
  UnrealBloomPass: class {
    readonly fake = true;
  },
}));
vi.mock("three/addons/postprocessing/OutputPass.js", () => ({
  OutputPass: class {
    readonly fake = true;
  },
}));

const [AIZAWA] = ATTRACTORS;
const LINES = [
  { start: 0, length: 3, speed: 1 },
  { start: 3, length: 2, speed: 1 },
];

function createView() {
  const container = document.createElement("div");
  document.body.append(container);
  const view = webglViewFactory.create(container, AIZAWA!, LINES, seededRandom(1));
  const pass = gpu.renderPasses.at(-1)!;
  const camera = pass.camera as PerspectiveCamera;
  const lines = (pass.scene as Scene).children[0] as LineSegments;
  return {
    view,
    container,
    camera,
    renderer: gpu.renderers.at(-1)!,
    composer: gpu.composers.at(-1)!,
    position: lines.geometry.getAttribute("position") as BufferAttribute,
    color: lines.geometry.getAttribute("color") as BufferAttribute,
    index: lines.geometry.getIndex()!,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("webglViewFactory.supported", () => {
  it("is false without WebGL 2", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(webglViewFactory.supported()).toBe(false);
  });

  it("is true with WebGL 2 and frees the test context", () => {
    const loseContext = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension: () => ({ loseContext }),
    } as unknown as WebGL2RenderingContext);
    expect(webglViewFactory.supported()).toBe(true);
    expect(loseContext).toHaveBeenCalled();
  });

  it("is true with WebGL 2 without the extension to free the context", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension: () => null,
    } as unknown as WebGL2RenderingContext);
    expect(webglViewFactory.supported()).toBe(true);
  });
});

describe("webglViewFactory.create", () => {
  it("puts the canvas into the container", () => {
    const { container, renderer } = createView();
    expect(container.querySelector("canvas")).toBe(renderer.domElement);
    // jsdom has no layout: the size is at least 1 pixel.
    expect(renderer.setSize).toHaveBeenCalledWith(1, 1);
  });

  it("connects the points of each line with segments", () => {
    const { index } = createView();
    expect(Array.from(index.array)).toEqual([0, 1, 1, 2, 3, 4]);
  });

  it("puts the camera at the place of the attractor and gives the mouse ray", () => {
    const { view } = createView();
    view.setCameraAngle(0);
    const ray = view.rayAt(0, 0);
    const [px, py, pz] = AIZAWA!.camera.position;
    const [tx, ty, tz] = AIZAWA!.camera.target;
    expect(ray.origin[0]).toBeCloseTo(px);
    expect(ray.origin[1]).toBeCloseTo(py);
    expect(ray.origin[2]).toBeCloseTo(pz);
    const length = Math.hypot(tx - px, ty - py, tz - pz);
    expect(ray.direction[0]).toBeCloseTo((tx - px) / length);
    expect(ray.direction[1]).toBeCloseTo((ty - py) / length);
    expect(ray.direction[2]).toBeCloseTo((tz - pz) / length);
  });

  it("turns the camera about the up direction", () => {
    const { view } = createView();
    view.setCameraAngle(0.5);
    const ray = view.rayAt(0, 0);
    // Aizawa has y up: the height of the camera stays the same.
    expect(ray.origin[1]).toBeCloseTo(AIZAWA!.camera.position[1]);
    expect(ray.origin[0]).not.toBeCloseTo(AIZAWA!.camera.position[0]);
  });

  it("colors the lines with the palette", () => {
    const { view, color } = createView();
    view.setPalette(findPalette("mond"));
    const values = Array.from(color.array);
    // The head of the first line is bright, its end is dark.
    expect(values[0]).toBeGreaterThan(0.2);
    expect(values[8]).toBe(0);
    expect(color.version).toBeGreaterThan(0);
  });

  it("draws the points", () => {
    const { view, position, composer } = createView();
    const points = new Float32Array(15).map((_, i) => i);
    view.draw(points);
    expect(Array.from(position.array)).toEqual(Array.from(points));
    expect(composer.render).toHaveBeenCalled();
  });

  it("follows the size of the container, also in a tall picture", () => {
    const { view, camera, renderer, composer } = createView();
    view.resize(200, 400);
    expect(camera.aspect).toBe(0.5);
    expect(camera.fov).toBeGreaterThan(75);
    expect(renderer.setSize).toHaveBeenLastCalledWith(200, 400);
    expect(composer.setSize).toHaveBeenLastCalledWith(200, 400);

    view.resize(0, 0);
    expect(renderer.setSize).toHaveBeenLastCalledWith(1, 1);
  });

  it("frees the graphics and removes the canvas", () => {
    const { view, container, renderer, composer } = createView();
    view.dispose();
    expect(renderer.dispose).toHaveBeenCalled();
    expect(renderer.forceContextLoss).toHaveBeenCalled();
    expect(composer.dispose).toHaveBeenCalled();
    expect(container.querySelector("canvas")).toBeNull();
  });
});
