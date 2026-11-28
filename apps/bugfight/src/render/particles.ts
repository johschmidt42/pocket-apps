import {
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
} from "three";
import { cosmeticRandom } from "./cosmetic-random.ts";
import { LAYER } from "./stage.ts";

/** What one burst of particles looks like. All lengths are in field units, all times in seconds. */
export type Burst = {
  count: number;
  /** Each particle gets one of these colors. A color over white glows. */
  colors: Color[];
  /** The speed of a particle is between these two values. The direction is random. */
  slowest: number;
  fastest: number;
  /** The radius at the start. The particle gets smaller until it is gone. */
  size: number;
  /** The length of the life of a particle. */
  seconds: number;
  /** A fall in field units per second, per second. 0 for a spark, a positive value for a splinter. */
  fall?: number;
};

/** Sparks and splinters. They are cosmetic: the sim does not know them. */
export type Particles = {
  object: InstancedMesh;
  burst: (x: number, y: number, burst: Burst) => void;
  update: (seconds: number) => void;
  /** Removes all particles. For a new game. */
  reset: () => void;
  dispose: () => void;
};

const MOST = 1500;
/** How fast a particle becomes slower. */
const DRAG = 3;

type Particle = {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  fall: number;
  size: number;
  age: number;
  life: number;
  color: Color;
};

const VERTEX = `
  attribute float fade;
  varying vec2 vPlace;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vPlace = position.xy;
    vColor = instanceColor;
    vFade = fade;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = `
  varying vec2 vPlace;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    float inside = 1.0 - smoothstep(0.7, 1.0, length(vPlace));
    if (inside <= 0.0) discard;
    gl_FragColor = vec4(vColor, inside * vFade);
    #include <colorspace_fragment>
  }
`;

export function createParticles(seed: number): Particles {
  const random = cosmeticRandom(seed);
  const geometry = new PlaneGeometry(2, 2);
  const fade = new InstancedBufferAttribute(new Float32Array(MOST), 1);
  fade.setUsage(DynamicDrawUsage);
  geometry.setAttribute("fade", fade);
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    // The depth test stays on: Seven is nearer to the camera and covers the particles.
    depthWrite: false,
  });
  const object = new InstancedMesh(geometry, material, MOST);
  object.instanceMatrix.setUsage(DynamicDrawUsage);
  object.position.z = LAYER.particles;
  object.frustumCulled = false;
  object.count = 0;
  // The first color creates the list of colors of the mesh. The shader needs it.
  object.setColorAt(0, new Color("#ffffff"));

  let particles: Particle[] = [];
  const matrix = new Matrix4();

  return {
    object,
    burst(x, y, burst) {
      for (let index = 0; index < burst.count && particles.length < MOST; index++) {
        const angle = random() * 2 * Math.PI;
        const speed = burst.slowest + random() * (burst.fastest - burst.slowest);
        const color = burst.colors[Math.floor(random() * burst.colors.length)];
        if (color === undefined) return;
        particles.push({
          x,
          y,
          speedX: Math.cos(angle) * speed,
          speedY: Math.sin(angle) * speed,
          fall: burst.fall ?? 0,
          size: burst.size * (0.6 + random() * 0.8),
          age: 0,
          life: burst.seconds * (0.7 + random() * 0.6),
          color,
        });
      }
    },
    update(seconds) {
      const slower = Math.exp(-DRAG * seconds);
      particles = particles.filter((particle) => {
        particle.age += seconds;
        if (particle.age >= particle.life) return false;
        particle.x += particle.speedX * seconds;
        particle.y += particle.speedY * seconds;
        particle.speedX *= slower;
        particle.speedY = particle.speedY * slower - particle.fall * seconds;
        return true;
      });
      particles.forEach((particle, index) => {
        const rest = 1 - particle.age / particle.life;
        const size = particle.size * (0.35 + 0.65 * rest);
        matrix.makeScale(size, size, 1);
        matrix.setPosition(particle.x, particle.y, 0);
        object.setMatrixAt(index, matrix);
        object.setColorAt(index, particle.color);
        fade.setX(index, Math.min(rest * 2.5, 1));
      });
      object.count = particles.length;
      object.instanceMatrix.needsUpdate = true;
      if (object.instanceColor !== null) object.instanceColor.needsUpdate = true;
      fade.needsUpdate = true;
    },
    reset() {
      particles = [];
      object.count = 0;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      object.dispose();
    },
  };
}
