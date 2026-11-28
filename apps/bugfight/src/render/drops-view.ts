import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
} from "three";
import type { Drop } from "../sim/state.ts";
import { GLOW, LAYER } from "./stage.ts";

/** The pictures of the drops that the enemies spit. */
export type DropsView = {
  object: Group;
  update: (drops: Drop[], alpha: number) => void;
  dispose: () => void;
};

/** The color of all enemy shots. Nothing else in the game uses it. */
const HOT_PINK = "#ff2e88";

/** A soft round glow. */
function paintGlow(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("The browser has no 2D canvas.");
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  glow.addColorStop(0.35, "rgba(255, 255, 255, 0.35)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  return canvas;
}

export function createDropsView(): DropsView {
  const object = new Group();
  object.name = "drops";
  object.position.z = LAYER.shots;

  const ball = new SphereGeometry(1, 16, 12);
  const square = new PlaneGeometry(2, 2);
  const pink = new MeshBasicMaterial({ color: HOT_PINK });
  // The core is brighter than white. Thus the glow effect of the stage makes it shine.
  const white = new MeshBasicMaterial({ color: new Color("#ffe3f0").multiplyScalar(GLOW) });
  const glowTexture = new CanvasTexture(paintGlow());
  const glow = new MeshBasicMaterial({
    map: glowTexture,
    color: HOT_PINK,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  /** One picture per drop. The list grows when the sim has more drops. */
  const pictures: Group[] = [];

  const create = (): Group => {
    const picture = new Group();
    const halo = new Mesh(square, glow);
    halo.scale.setScalar(3.2);
    halo.position.z = -2;
    // A drop is longer than it is wide, because it falls.
    const body = new Mesh(ball, pink);
    body.scale.set(0.85, 1.25, 0.85);
    const core = new Mesh(ball, white);
    core.scale.set(0.4, 0.6, 0.4);
    core.position.set(0, -0.25, 1);
    picture.add(halo, body, core);
    object.add(picture);
    return picture;
  };

  return {
    object,
    update(drops, alpha) {
      while (pictures.length < drops.length) pictures.push(create());
      pictures.forEach((picture, index) => {
        const drop = drops[index];
        picture.visible = drop !== undefined;
        if (drop === undefined) return;
        picture.position.set(
          drop.prevX + (drop.x - drop.prevX) * alpha,
          drop.prevY + (drop.y - drop.prevY) * alpha,
          0,
        );
        picture.scale.setScalar(drop.radius);
      });
    },
    dispose() {
      ball.dispose();
      square.dispose();
      pink.dispose();
      white.dispose();
      glowTexture.dispose();
      glow.dispose();
    },
  };
}
