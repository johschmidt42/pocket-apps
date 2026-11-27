// Wall Sit (Maxim 56: "a 56-second wall sit"): the back is flat on the wall, the thighs are level, the
// knees are bent 90 degrees over the ankles. The arms are crossed on the chest: the hands do not rest on the legs.
// The figure holds still. It breathes: the chest rises and sinks a very little.
import type { Exercise, View } from "../exercise.ts";
import { BODY, type Pose } from "../skeleton.ts";

/** The wall is behind the figure, which looks to +x. */
const WALL = 40;
/** The back touches the wall: the half width of the torso. */
const HIP = { x: WALL + 9.5, y: 200 - BODY.shin };
const FEET = { x: HIP.x + BODY.thigh, y: 200 };

function sit(breath: number): Pose {
  const shoulder = { x: HIP.x, y: HIP.y - BODY.torso };
  // The arms are crossed on the chest: the hands are below the shoulders, in front of the chest.
  const hands = { x: shoulder.x + 13, y: shoulder.y + 10 - breath };
  return {
    hip: HIP,
    lean: 0,
    head: 0,
    shrug: breath,
    feet: FEET,
    toes: 90,
    stance: 9,
    knees: 0.15,
    hands,
    grip: 4,
    elbowTo: 0,
    elbowsOut: 1.2,
  };
}

const VIEWS: [View, View] = [
  { label: "Seite", yaw: 0, box: [20, 40, 150, 172] },
  { label: "Vorn", yaw: 90, box: [-60, 40, 120, 172] },
];

export const WALL_SIT: Exercise = {
  key: "wall-sit",
  title: "Wall Sit",
  equipment: { kind: "wall", wall: WALL, side: "left" },
  views: VIEWS,
  start: sit(0),
  steps: [
    { to: sit(1), seconds: 1.4, label: "Halten", ease: "soft" },
    { to: sit(0), seconds: 1.6, label: "Halten", ease: "soft" },
  ],
};
