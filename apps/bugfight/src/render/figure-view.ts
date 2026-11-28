import type { BufferGeometry, MeshToonMaterial } from "three";
import {
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Group,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Material,
} from "three";
import type { Figure, FigureInput, FigurePose, Part, Shape } from "../models/model.ts";
import { ease, mixPoses } from "../models/pose.ts";
import { outlineMaterial } from "./outline.ts";
import { toonMaterial } from "./toon.ts";

/** What the game knows about a figure at each picture. The view adds the times. */
export type LiveInput = Pick<FigureInput, "lean" | "look" | "spots" | "weapon" | "ammo">;

/** The picture of one figure: three.js objects, built from the data of the figure. */
export type FigureView = {
  object: Group;
  /** Starts a motion. A motion with a length goes back to the base motion at its end. */
  play: (motion: string) => void;
  /** The motion that runs. */
  motion: () => string;
  /** Moves the figure on by this time. */
  update: (seconds: number, live: LiveInput) => void;
  /** Shows the pose of an exact moment, with no blend from the motion before. For the frames tool. */
  show: (input: FigureInput) => void;
  dispose: () => void;
};

/** A change of the motion blends from the old pose to the new one in this time. */
const BLEND_SECONDS = 0.1;

const FRONT = new Vector3(0, 0, 1);

/** The shapes are the same for all figures. A map keeps one geometry for each shape. */
const geometries = new Map<string, BufferGeometry>();

function geometryOf(shape: Shape): BufferGeometry {
  const key = shape.kind === "sphere" || shape.kind === "half" ? shape.kind : JSON.stringify(shape);
  let geometry = geometries.get(key);
  if (geometry === undefined) {
    switch (shape.kind) {
      case "sphere":
        geometry = new SphereGeometry(1, 28, 18);
        break;
      case "half":
        geometry = new SphereGeometry(1, 16, 18, Math.PI / 2, Math.PI);
        break;
      case "capsule":
        geometry = new CapsuleGeometry(shape.radius, shape.length, 6, 14);
        break;
      case "cone":
        geometry = new ConeGeometry(shape.radius, shape.length, 20);
        break;
      case "cylinder":
        geometry = new CylinderGeometry(shape.radius, shape.radius, shape.length, 20);
        break;
      case "torus":
        geometry = new TorusGeometry(shape.radius, shape.tube, 10, 28);
        break;
    }
    geometries.set(key, geometry);
  }
  return geometry;
}

type Joint = { group: Group; restAt: Vector3; restTurn: Quaternion };

/** `startTime` shifts the motion that repeats. Give each figure of a group another value, or they all move together. */
export function createFigureView(figure: Figure, startTime = 0): FigureView {
  const joints = new Map<string, Joint>();
  /** Each figure has its own materials, so that a flash changes only this figure. */
  const materials = new Map<string, Material>();
  const toons: MeshToonMaterial[] = [];

  const materialOf = (part: Part): Material => {
    const surface = part.surface ?? "toon";
    const color = part.color ?? "#ff00ff";
    const key = `${surface} ${color}`;
    let material = materials.get(key);
    if (material === undefined) {
      if (surface === "toon") {
        const toon = toonMaterial(color);
        toons.push(toon);
        material = toon;
      } else if (surface === "flat") {
        material = new MeshBasicMaterial({ color });
      } else {
        material = new MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.42,
          side: DoubleSide,
          depthWrite: false,
        });
      }
      materials.set(key, material);
    }
    return material;
  };

  const build = (part: Part): Group => {
    const group = new Group();
    group.name = part.name;
    if (part.at !== undefined) group.position.set(...part.at);
    if (part.face !== undefined) {
      group.quaternion.setFromUnitVectors(FRONT, new Vector3(...part.face).normalize());
    } else if (part.turn !== undefined) {
      group.quaternion.setFromEuler(new Euler(...part.turn));
    }
    joints.set(part.name, {
      group,
      restAt: group.position.clone(),
      restTurn: group.quaternion.clone(),
    });

    if (part.shape !== undefined) {
      const { shape } = part;
      const place = (mesh: Mesh) => {
        if (part.shapeAt !== undefined) mesh.position.set(...part.shapeAt);
        if (part.shapeTurn !== undefined) mesh.rotation.set(...part.shapeTurn);
        if (shape.kind === "sphere" || shape.kind === "half") mesh.scale.set(...shape.size);
        group.add(mesh);
      };
      place(new Mesh(geometryOf(shape), materialOf(part)));
      const outlined = part.outline ?? (part.surface ?? "toon") !== "wing";
      if (outlined) place(new Mesh(geometryOf(shape), outlineMaterial()));
    }
    for (const child of part.parts ?? []) group.add(build(child));
    return group;
  };

  const object = build(figure.spec.root);
  const base = figure.motions[0]?.name ?? "";
  const lengths = new Map(figure.motions.map((motion) => [motion.name, motion.seconds]));

  const turn = new Quaternion();
  const euler = new Euler();
  const apply = (pose: FigurePose) => {
    for (const [name, joint] of joints) {
      const part = pose.parts[name];
      const { group } = joint;
      group.position.copy(joint.restAt);
      group.quaternion.copy(joint.restTurn);
      group.scale.setScalar(1);
      if (part === undefined) continue;
      if (part.move !== undefined) group.position.add(new Vector3(...part.move));
      if (part.turn !== undefined)
        group.quaternion.multiply(turn.setFromEuler(euler.set(...part.turn)));
      if (typeof part.grow === "number") group.scale.setScalar(part.grow);
      else if (part.grow !== undefined) group.scale.set(...part.grow);
    }
    for (const toon of toons) toon.emissive.setScalar(pose.flash);
  };

  let time = startTime;
  let motion = base;
  let motionTime = 0;
  /** The motion before the last change. It runs on while the blend lasts. */
  let before: { motion: string; motionTime: number } | null = null;
  let blend = 0;

  const view: FigureView = {
    object,
    play(next) {
      before = { motion, motionTime };
      blend = 0;
      motion = next;
      motionTime = 0;
    },
    motion: () => motion,
    update(seconds, live) {
      time += seconds;
      motionTime += seconds;
      blend += seconds;
      const length = lengths.get(motion);
      if (typeof length === "number" && motionTime >= length) view.play(base);

      const now = figure.pose({ ...live, time, motion, motionTime });
      if (before === null || blend >= BLEND_SECONDS) {
        before = null;
        apply(now);
        return;
      }
      before.motionTime += seconds;
      const old = figure.pose({ ...live, time, ...before });
      apply({
        parts: mixPoses(old.parts, now.parts, ease(blend / BLEND_SECONDS)),
        flash: now.flash,
      });
    },
    show(input) {
      apply(figure.pose(input));
    },
    dispose() {
      for (const material of materials.values()) material.dispose();
    },
  };
  view.show({ time: 0, motion: base, motionTime: 0, lean: [0, 0], look: [0, 0], spots: 7 });
  return view;
}
