import type * as Three from "three";
import type { InstancedMesh, Object3D, OrthographicCamera, Scene } from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBot } from "../sim/bot.ts";
import type { SimEvent } from "../sim/events.ts";
import { TICK_SECONDS } from "../sim/field.ts";
import { NO_INPUT } from "../sim/input.ts";
import { createState, type GameState } from "../sim/state.ts";
import { step } from "../sim/step.ts";
import { webglViewFactory, type View } from "./view.ts";

// jsdom has no WebGL. These fakes replace only the parts that talk to the GPU:
// the renderer and the chain of effects after the render. All other objects are real three.js.
const gpu = vi.hoisted(() => ({
  renderers: [] as { domElement: HTMLCanvasElement; dispose: ReturnType<typeof vi.fn> }[],
  composers: [] as { render: ReturnType<typeof vi.fn>; setSize: ReturnType<typeof vi.fn> }[],
  renderPasses: [] as { scene: Scene; camera: OrthographicCamera }[],
}));

vi.mock("three", async (importOriginal) => ({
  ...(await importOriginal<typeof Three>()),
  WebGLRenderer: class {
    domElement = document.createElement("canvas");
    setPixelRatio = vi.fn();
    setSize = vi.fn();
    dispose = vi.fn();
    constructor() {
      gpu.renderers.push(this);
    }
  },
  WebGLRenderTarget: class {
    dispose = vi.fn();
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
    constructor(scene: Scene, camera: OrthographicCamera) {
      gpu.renderPasses.push({ scene, camera });
    }
  },
}));
vi.mock("three/addons/postprocessing/UnrealBloomPass.js", () => ({
  UnrealBloomPass: class {
    dispose = vi.fn();
  },
}));
vi.mock("three/addons/postprocessing/OutputPass.js", () => ({
  OutputPass: class {
    readonly fake = true;
  },
}));

/** jsdom has no 2D canvas. The garden paints into this fake. `webgl` says if the browser has WebGL 2. */
function fakeCanvas(webgl = false) {
  const context2d = {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    scale: vi.fn(),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
  };
  const loseContext = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((kind: string) => {
    if (kind === "2d") return context2d;
    return webgl ? { getExtension: () => ({ loseContext }) } : null;
  }) as never);
  return { context2d, loseContext };
}

function createView(): {
  view: View;
  container: HTMLElement;
  scene: Scene;
  camera: OrthographicCamera;
} {
  const container = document.createElement("div");
  document.body.append(container);
  const view = webglViewFactory.create(container);
  const pass = gpu.renderPasses.at(-1)!;
  return { view, container, scene: pass.scene, camera: pass.camera };
}

/** Lets the bot play and shows each fourth tick, with all events since the last picture. */
function play(view: View, state: GameState, ticks: number, hitAreas = false): SimEvent[] {
  const bot = createBot();
  const all: SimEvent[] = [];
  let events: SimEvent[] = [];
  for (let tick = 1; tick <= ticks; tick++) {
    events.push(...step(state, bot(state)));
    if (tick % 4 !== 0) continue;
    view.update(state, { seconds: 4 * TICK_SECONDS, alpha: 0.5, events, hitAreas });
    all.push(...events);
    events = [];
  }
  return all;
}

/** Shows the same state for some time, with these events in the first picture. */
function show(view: View, state: GameState, seconds: number, events: SimEvent[] = []): void {
  view.update(state, { seconds: 0.05, alpha: 1, events, hitAreas: false });
  for (let time = 0.05; time < seconds; time += 0.05) {
    view.update(state, { seconds: 0.05, alpha: 1, events: [], hitAreas: false });
  }
}

/** The figures in the scene: each figure has a top part with the name "body". */
const figures = (scene: Scene) => scene.getObjectsByProperty("name", "body");
const seven = (scene: Scene) => figures(scene).find((figure) => figure.getObjectByName("tank"))!;

function instanced(scene: Scene, attribute: string): InstancedMesh {
  let found: Object3D | undefined;
  scene.traverse((object) => {
    if ("isInstancedMesh" in object && (object as InstancedMesh).geometry.hasAttribute(attribute)) {
      found = object;
    }
  });
  return found as InstancedMesh;
}

describe("the picture of the game", () => {
  beforeEach(() => {
    fakeCanvas();
  });

  it("puts a canvas into the container, draws through the glow effect, and cleans up", () => {
    const { view, container } = createView();
    const renderer = gpu.renderers.at(-1)!;
    expect(container).toContainElement(view.canvas);
    expect(view.canvas).toBe(renderer.domElement);

    view.draw();
    expect(gpu.composers.at(-1)!.render).toHaveBeenCalledOnce();

    view.dispose();
    expect(container).toBeEmptyDOMElement();
    expect(renderer.dispose).toHaveBeenCalledOnce();
  });

  it("shows Seven at the place of the sim, with his 7 spots and his weapon on his back", () => {
    const { view, scene } = createView();
    const state = createState();
    state.player.x = 120;
    state.player.y = -80;
    show(view, state, 0.1);
    const figure = seven(scene);
    expect(figure.position.x).toBeCloseTo(120, 0);
    expect(figure.position.y).toBeCloseTo(-80, 0);
    expect(figure.getObjectByName("spot-center")!.scale.x).toBe(1);
    // Seven starts with the drum of the "Kernspucker".
    expect(figure.getObjectByName("drum")!.scale.x).toBe(1);
    expect(figure.getObjectByName("tank")!.scale.x).toBe(0);

    // The other weapon shows on his back, and a lost spot is gone.
    state.player.weapon = "spray";
    state.player.spots = 6;
    show(view, state, 0.1);
    expect(figure.getObjectByName("tank")!.scale.x).toBe(1);
    expect(figure.getObjectByName("drum")!.scale.x).toBe(0);
    expect(figure.getObjectByName("spot-right-3")!.scale.x).toBe(0);
  });

  it("shows one figure for each ant in the field, and the gas of Seven", () => {
    const { view, scene } = createView();
    const state = createState();
    state.player.weapon = "spray";
    play(view, state, 240, true);
    const inField = state.enemies.filter((enemy) => enemy.state !== "waiting");
    expect(inField.length).toBeGreaterThan(5);
    expect(inField.length).toBeLessThan(40);

    // A fight: the bot sprays, ants die, sparks fly.
    const events = play(view, state, 900);
    const died = events.filter((event) => event.type === "enemy-died").length;
    expect(died).toBeGreaterThan(0);
    expect(state.enemies).toHaveLength(40 - died);
    // Each living ant and Seven have a figure. A dead ant has one for a moment more.
    expect(figures(scene).length).toBeGreaterThanOrEqual(state.enemies.length + 1);
    expect(figures(scene).length).toBeLessThanOrEqual(state.enemies.length + 1 + 6);
    expect(instanced(scene, "puff").count).toBe(state.puffs.length);
    expect(events.some((event) => event.type === "tank-empty") || state.puffs.length > 0).toBe(
      true,
    );

    // After some time with no new death, only the living ants and Seven have a figure.
    show(view, state, 1);
    expect(figures(scene)).toHaveLength(state.enemies.length + 1);
  });

  it("makes particles for a death and removes them after a moment", () => {
    const { view, scene } = createView();
    const state = createState();
    show(view, state, 0.05, [{ type: "enemy-died", id: 99, x: 10, y: 20 }]);
    expect(instanced(scene, "fade").count).toBeGreaterThan(10);
    show(view, state, 1.5);
    expect(instanced(scene, "fade").count).toBe(0);
  });

  it("shows the stones of the second weapon and the drops of the ants", () => {
    const { view, scene } = createView();
    const state = createState();
    state.player.weapon = "seeds";
    state.player.immortal = true;
    const events = play(view, state, 1600);
    expect(events.some((event) => event.type === "seed-shot")).toBe(true);
    expect(events.some((event) => event.type === "drum-empty")).toBe(true);
    // The pictures of stones and drops are in the scene. A picture that is not in use is not visible.
    expect(state.seeds.length + state.drops.length).toBeGreaterThan(0);
    const visible = (name: string) => {
      const group = scene.children.find((child) => child.name === name)!;
      return group.children.filter((child) => child.visible).length;
    };
    expect(visible("seeds")).toBe(state.seeds.length);
    expect(visible("drops")).toBe(state.drops.length);
  });

  it("shows a clump of pollen with one golden ball for each grain", () => {
    const { view, scene } = createView();
    const state = createState();
    const clump = { x: 50, y: 60, prevX: 50, prevY: 60, speedX: 0, speedY: 0, radius: 14 };
    state.loot.push({ ...clump, grains: 3, bounces: 0, restTicks: 0 });
    show(view, state, 0.05, [{ type: "loot-collected", x: 0, y: 0, grains: 4 }]);
    const group = scene.children.find((child) => child.name === "loot")!;
    const picture = group.children[0]!;
    expect(picture.visible).toBe(true);
    expect(picture.position.x).toBe(50);
    expect(picture.children.filter((grain) => grain.visible)).toHaveLength(3);
    // The sparks of the pollen that Seven collected.
    expect(instanced(scene, "fade").count).toBeGreaterThan(10);

    // A clump that lies still blinks. A clump that is gone has no visible picture.
    state.loot[0]!.restTicks = 5;
    const seen = new Set<boolean>();
    for (let step = 0; step < 20; step++) {
      show(view, state, 0.03);
      seen.add(picture.visible);
    }
    expect(seen).toEqual(new Set([true, false]));
    state.loot.length = 0;
    show(view, state, 0.05);
    expect(picture.visible).toBe(false);
  });

  it("shakes the camera after a hit of Seven and comes to rest", () => {
    const { view, camera } = createView();
    const state = createState();
    show(view, state, 0.05, [{ type: "player-hit" }]);
    expect(Math.hypot(camera.position.x, camera.position.y)).toBeGreaterThan(0.5);
    show(view, state, 1.5);
    expect(camera.position.x).toBe(0);
    expect(camera.position.y).toBe(0);
  });

  it("hides Seven after his death and shows him again in a new game", () => {
    const { view, scene } = createView();
    const state = createState();
    show(view, state, 0.1);
    const figure = seven(scene);

    state.player.spots = 0;
    state.over = "lost";
    show(view, state, 0.5, [{ type: "player-hit" }, { type: "player-died" }]);
    expect(figure.visible).toBe(true);
    show(view, state, 1);
    expect(figure.visible).toBe(false);

    view.reset();
    show(view, createState(), 0.1);
    expect(figure.visible).toBe(true);
  });

  it("lets Seven blink while nothing can hurt him", () => {
    const { view, scene } = createView();
    const state = createState();
    show(view, state, 0.1);
    const figure = seven(scene);
    state.player.safeTicks = 100;
    const seen = new Set<boolean>();
    for (let picture = 0; picture < 20; picture++) {
      show(view, state, 0.03);
      seen.add(figure.visible);
    }
    expect(seen).toEqual(new Set([true, false]));
  });

  it("plays the win of Seven, the empty tank and the hit of an ant without an error", () => {
    const { view } = createView();
    const state = createState();
    play(view, state, 700);
    const ant = state.enemies.find((enemy) => enemy.state === "formation")!;
    show(view, state, 0.3, [
      { type: "tank-empty" },
      { type: "enemy-hit", id: ant.id },
      { type: "enemy-hit", id: 12345 },
    ]);
    show(view, state, 2, [{ type: "wave-cleared" }]);
    step(state, NO_INPUT);
    expect(() => {
      view.reset();
    }).not.toThrow();
  });
});

describe("the check for WebGL 2", () => {
  it("is false in a browser with no WebGL 2", () => {
    fakeCanvas(false);
    expect(webglViewFactory.supported()).toBe(false);
  });

  it("is true in a browser with WebGL 2, and gives the test context back", () => {
    const { loseContext } = fakeCanvas(true);
    expect(webglViewFactory.supported()).toBe(true);
    expect(loseContext).toHaveBeenCalledOnce();
  });
});
