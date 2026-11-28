import { BufferGeometry, Group, LineBasicMaterial, LineLoop, Vector3 } from "three";
import { ANT } from "../content/enemies.ts";
import { FIELD } from "../sim/field.ts";
import { PLAYER_HIT_RADIUS, PLAYER_MARGIN, type GameState } from "../sim/state.ts";
import { LAYER } from "./stage.ts";

/** Lines that show what the sim knows: the hit areas and the limits of the field. */
export type DebugOverlay = {
  object: Group;
  update: (state: GameState, visible: boolean) => void;
  dispose: () => void;
};

type Circle = { x: number; y: number; radius: number };

/** A circle with the radius 1. The scale of its object gives the real radius. */
function circle(): BufferGeometry {
  const points = Array.from({ length: 48 }, (_, index) => {
    const angle = (index / 48) * 2 * Math.PI;
    return new Vector3(Math.cos(angle), Math.sin(angle), 0);
  });
  return new BufferGeometry().setFromPoints(points);
}

function rectangle(halfWidth: number, halfHeight: number): BufferGeometry {
  return new BufferGeometry().setFromPoints([
    new Vector3(-halfWidth, -halfHeight, 0),
    new Vector3(halfWidth, -halfHeight, 0),
    new Vector3(halfWidth, halfHeight, 0),
    new Vector3(-halfWidth, halfHeight, 0),
  ]);
}

export function createDebugOverlay(): DebugOverlay {
  const object = new Group();
  object.position.z = LAYER.debug;
  object.visible = false;

  const circleGeometry = circle();
  const limitGeometry = rectangle(
    FIELD.width / 2 - PLAYER_MARGIN,
    FIELD.height / 2 - PLAYER_MARGIN,
  );
  const materials: LineBasicMaterial[] = [];
  const line = (color: string, opacity = 1) => {
    const material = new LineBasicMaterial({
      color,
      depthTest: false,
      transparent: opacity < 1,
      opacity,
    });
    materials.push(material);
    return material;
  };

  /** A list of circles in one color. It grows when the sim has more objects. */
  const circles = (color: string) => {
    const material = line(color);
    const loops: LineLoop[] = [];
    return (list: Circle[]) => {
      while (loops.length < list.length) {
        const loop = new LineLoop(circleGeometry, material);
        loops.push(loop);
        object.add(loop);
      }
      loops.forEach((loop, index) => {
        const item = list[index];
        loop.visible = item !== undefined;
        if (item === undefined) return;
        loop.position.set(item.x, item.y, 0);
        loop.scale.setScalar(item.radius);
      });
    };
  };
  const showPlayer = circles("#3df2ff");
  const showPuffs = circles("#fff04a");
  const showEnemies = circles("#ffffff");
  const showDrops = circles("#ff2e88");
  const showSeeds = circles("#9dff5a");
  // The center of Seven cannot leave this rectangle.
  object.add(new LineLoop(limitGeometry, line("#ffffff", 0.6)));

  return {
    object,
    update(state, visible) {
      object.visible = visible;
      if (!visible) return;
      showPlayer([{ x: state.player.x, y: state.player.y, radius: PLAYER_HIT_RADIUS }]);
      showPuffs(state.puffs);
      showEnemies(
        state.enemies
          .filter((enemy) => enemy.state !== "waiting")
          .map((enemy) => ({ x: enemy.x, y: enemy.y, radius: ANT.radius })),
      );
      showDrops(state.drops);
      showSeeds(state.seeds);
    },
    dispose() {
      for (const material of materials) material.dispose();
      circleGeometry.dispose();
      limitGeometry.dispose();
    },
  };
}
