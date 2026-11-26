// Front-rack Lunge with two kettlebells (Daniel Ray: "double-kettlebell front-rack lunge"). Each bell lies
// on the back of its forearm beside the shoulder, as in the rack of the kettlebell thruster. The legs are
// `walking-lunge.ts`.
import type { Exercise } from "../exercise.ts";
import { handAt } from "../poses.ts";
import { lunge, type Upper } from "./walking-lunge.ts";

const kettlebellRack: Upper = (_part, hip, lean) => ({
  hands: handAt(hip, lean, 3, -9),
  grip: 20,
  head: 0,
  elbowTo: 80,
  elbowsOut: 0.4,
});

export const FRONT_RACK_LUNGE: Exercise = lunge({
  key: "front-rack-lunge",
  title: "Front-rack Lunge (Kettlebells)",
  equipment: { kind: "kettlebells" },
  upper: kettlebellRack,
});
