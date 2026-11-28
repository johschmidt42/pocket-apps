import {
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
} from "three";
import type { Puff } from "../sim/state.ts";
import { LAYER } from "./stage.ts";

/** The picture of the gas: one soft cartoon cloud per puff of the sim. */
export type GasView = {
  object: InstancedMesh;
  /** `alpha` says how far the time is between the last tick (0) and the next one (1). */
  update: (puffs: Puff[], alpha: number, seconds: number) => void;
  dispose: () => void;
};

/** The picture shows at most this number of puffs. The sim makes fewer than 260 at the highest level. */
const MOST_PUFFS = 400;

const VERTEX = `
  attribute vec2 puff;
  varying vec2 vPlace;
  varying vec2 vPuff;
  void main() {
    vPlace = position.xy;
    vPuff = puff;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

// Each puff is a square. The shader paints a cloud into it: a round shape with bumps at the edge,
// in three colors with hard steps, as the figures have. The light comes from the top left.
const FRAGMENT = `
  uniform vec3 light;
  uniform vec3 body;
  uniform vec3 rim;
  uniform float time;
  varying vec2 vPlace;
  varying vec2 vPuff;
  void main() {
    float age = vPuff.x;
    float look = vPuff.y;
    float angle = atan(vPlace.y, vPlace.x);
    float turn = look * 6.2832 + time * (look - 0.5) * 2.4;
    float edge = 0.86 + 0.05 * sin(angle * 4.0 + turn) + 0.035 * sin(angle * 7.0 - turn * 1.7);
    float far = length(vPlace) / edge;
    float inside = 1.0 - smoothstep(0.93, 1.0, far);
    if (inside <= 0.0) discard;
    float lit = length(vPlace - vec2(-0.22, 0.24)) / edge;
    vec3 color = mix(body, rim, smoothstep(0.74, 0.79, far));
    color = mix(light, color, smoothstep(0.4, 0.45, lit));
    // A new puff appears fast. An old puff goes away slowly.
    float fade = smoothstep(0.0, 0.06, age) * (1.0 - smoothstep(0.45, 1.0, age));
    gl_FragColor = vec4(color, 0.6 * fade * inside);
    #include <colorspace_fragment>
  }
`;

export function createGasView(): GasView {
  // A square from -1 to 1. The radius of the puff is its scale.
  const geometry = new PlaneGeometry(2, 2);
  const puffData = new InstancedBufferAttribute(new Float32Array(MOST_PUFFS * 2), 2);
  puffData.setUsage(DynamicDrawUsage);
  geometry.setAttribute("puff", puffData);
  const uniforms = { time: { value: 0 } };
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    uniforms: {
      ...uniforms,
      // "Zitronella-Nebel": pale lemon with a cool rim.
      light: { value: new Color("#fdffe6") },
      body: { value: new Color("#e6f77c") },
      rim: { value: new Color("#5cc4a4") },
    },
  });
  const object = new InstancedMesh(geometry, material, MOST_PUFFS);
  object.instanceMatrix.setUsage(DynamicDrawUsage);
  object.position.z = LAYER.gas;
  object.frustumCulled = false;
  object.count = 0;

  const matrix = new Matrix4();
  let time = 0;
  return {
    object,
    update(puffs, alpha, seconds) {
      time += seconds;
      uniforms.time.value = time;
      let count = 0;
      for (const puff of puffs) {
        if (count >= MOST_PUFFS) break;
        const index = count;
        count += 1;
        matrix.makeScale(puff.radius, puff.radius, 1);
        matrix.setPosition(
          puff.prevX + (puff.x - puff.prevX) * alpha,
          puff.prevY + (puff.y - puff.prevY) * alpha,
          0,
        );
        object.setMatrixAt(index, matrix);
        puffData.setXY(index, puff.age / puff.life, puff.look);
      }
      object.count = count;
      object.instanceMatrix.needsUpdate = true;
      puffData.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      object.dispose();
    },
  };
}
