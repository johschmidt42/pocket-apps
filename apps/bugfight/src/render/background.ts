import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import { FIELD } from "../sim/field.ts";
import { cosmeticRandom } from "./cosmetic-random.ts";
import { LAYER } from "./stage.ts";

/** The garden behind the fight. It is out of focus and moves slowly down, which gives a feeling of flight. */
export type Background = {
  object: Group;
  /** Moves the background by this time. */
  update: (seconds: number) => void;
  dispose: () => void;
};

/** The painted garden is a square of this number of pixels. It repeats in the direction of the flight. */
const TILE_PIXELS = 512;
/** The square covers this number of field units. */
const TILE_UNITS = FIELD.width;
/** The speed of the garden and of the dust, in field units per second. Near things are faster. */
const GARDEN_SPEED = 45;
const DUST_COUNT = 46;

const GREENS = ["#245c2a", "#2f7031", "#3d8a37", "#5aa343", "#86bd52", "#b4d66a", "#1c4a27"];
/** No red and no pink: red is the color of Seven, and hot pink is the color of enemy shots. */
const FLOWERS = ["#ffffff", "#fff3a6", "#ffd84a", "#cdb8ff", "#9fc4ff", "#ffe9d6"];

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("The browser has no 2D canvas.");
  return context;
}

/**
 * Paints the garden from above as soft spots: light and shade of the grass, flowers, round lights.
 * The Gaussian blur of the canvas puts each spot out of focus. The top edge fits the bottom edge.
 */
function paintGarden(random: () => number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_PIXELS;
  canvas.height = TILE_PIXELS;
  const context = context2d(canvas);
  context.fillStyle = "#3a7d33";
  context.fillRect(0, 0, TILE_PIXELS, TILE_PIXELS);

  const pick = (colors: string[]) => colors[Math.floor(random() * colors.length)] ?? "#3a7d33";
  const spots = (
    count: number,
    blur: number,
    paint: () => { radius: number; color: string; alpha: number },
  ) => {
    context.filter = `blur(${String(blur)}px)`;
    for (let i = 0; i < count; i++) {
      const x = random() * TILE_PIXELS;
      const y = random() * TILE_PIXELS;
      const { radius, color, alpha } = paint();
      context.fillStyle = color;
      context.globalAlpha = alpha;
      // A spot near the top or the bottom edge is painted a second time at the other edge.
      for (const shift of [-TILE_PIXELS, 0, TILE_PIXELS]) {
        const reach = radius + 3 * blur;
        if (y + shift + reach < 0 || y + shift - reach > TILE_PIXELS) continue;
        context.beginPath();
        context.arc(x, y + shift, radius, 0, 2 * Math.PI);
        context.fill();
      }
    }
  };
  spots(70, 20, () => ({
    radius: 34 + random() * 70,
    color: pick(GREENS),
    alpha: 0.3 + random() * 0.35,
  }));
  spots(38, 9, () => ({
    radius: 4 + random() * 9,
    color: pick(FLOWERS),
    alpha: 0.75 + random() * 0.2,
  }));
  spots(22, 3, () => ({
    radius: 9 + random() * 18,
    color: "#f6ffd8",
    alpha: 0.07 + random() * 0.1,
  }));
  context.filter = "none";
  context.globalAlpha = 1;
  return canvas;
}

/** A dark frame around the picture. It moves the eye to the center. */
function paintVignette(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 144;
  const context = context2d(canvas);
  context.scale(1, canvas.height / canvas.width);
  const half = canvas.width / 2;
  const shade = context.createRadialGradient(half, half, half * 0.45, half, half, half * 1.15);
  shade.addColorStop(0, "rgba(6, 26, 12, 0)");
  shade.addColorStop(1, "rgba(6, 26, 12, 0.72)");
  context.fillStyle = shade;
  context.fillRect(0, 0, canvas.width, canvas.width);
  return canvas;
}

/** A soft white dot for the dust. */
function paintDot(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = context2d(canvas);
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "rgba(255, 255, 240, 1)");
  glow.addColorStop(0.4, "rgba(255, 255, 240, 0.5)");
  glow.addColorStop(1, "rgba(255, 255, 240, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  return canvas;
}

export function createBackground(seed: number): Background {
  const random = cosmeticRandom(seed);
  const object = new Group();

  const gardenTexture = new CanvasTexture(paintGarden(random));
  gardenTexture.colorSpace = SRGBColorSpace;
  gardenTexture.wrapT = RepeatWrapping;
  gardenTexture.repeat.set(1, FIELD.height / TILE_UNITS);
  const gardenGeometry = new PlaneGeometry(FIELD.width, FIELD.height);
  const gardenMaterial = new MeshBasicMaterial({ map: gardenTexture });
  const garden = new Mesh(gardenGeometry, gardenMaterial);
  garden.position.z = LAYER.background;
  object.add(garden);

  const vignetteTexture = new CanvasTexture(paintVignette());
  const vignetteMaterial = new MeshBasicMaterial({
    map: vignetteTexture,
    transparent: true,
    depthWrite: false,
  });
  const vignette = new Mesh(gardenGeometry, vignetteMaterial);
  vignette.position.z = LAYER.vignette;
  object.add(vignette);

  const dotTexture = new CanvasTexture(paintDot());
  const dotGeometry = new PlaneGeometry(1, 1);
  const dotMaterial = new MeshBasicMaterial({
    map: dotTexture,
    transparent: true,
    opacity: 0.4,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const dust = new InstancedMesh(dotGeometry, dotMaterial, DUST_COUNT);
  dust.position.z = LAYER.dust;
  dust.frustumCulled = false;
  object.add(dust);
  const dots = Array.from({ length: DUST_COUNT }, () => {
    const size = 8 + random() * random() * 46;
    return {
      x: (random() - 0.5) * FIELD.width,
      y: (random() - 0.5) * FIELD.height,
      size,
      // A larger dot is nearer to the camera and thus faster.
      speed: GARDEN_SPEED * (1.6 + size / 12),
      sway: random() * 2 * Math.PI,
    };
  });
  const matrix = new Matrix4();
  let time = 0;
  const placeDust = () => {
    dots.forEach((dot, index) => {
      matrix.makeScale(dot.size, dot.size, 1);
      matrix.setPosition(dot.x + Math.sin(time * 0.6 + dot.sway) * 14, dot.y, 0);
      dust.setMatrixAt(index, matrix);
    });
    dust.instanceMatrix.needsUpdate = true;
  };
  placeDust();

  return {
    object,
    update(seconds) {
      time += seconds;
      gardenTexture.offset.y = (time * GARDEN_SPEED) / TILE_UNITS;
      const bottom = -FIELD.height / 2 - 40;
      for (const dot of dots) {
        dot.y -= dot.speed * seconds;
        if (dot.y < bottom) dot.y += FIELD.height + 80;
      }
      placeDust();
    },
    dispose() {
      gardenTexture.dispose();
      gardenGeometry.dispose();
      gardenMaterial.dispose();
      vignetteTexture.dispose();
      vignetteMaterial.dispose();
      dotTexture.dispose();
      dotGeometry.dispose();
      dotMaterial.dispose();
      dust.dispose();
    },
  };
}
