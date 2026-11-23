// Knees-to-elbows with a kip: back swing, the knees come up, and they touch the elbows. The arms stay long.
// The body of `toes-to-bar-tuck.ts`, with the feet a little wider: the knees come up just inside the arms.
import type { Exercise, View } from "../exercise.ts";
import type { Pose } from "../skeleton.ts";
import { pose } from "./toes-to-bar-tuck.ts";

const BAR = { x: 78, y: 30 };
/** Half the distance between the feet. The knees are then just inside the elbows. */
const STANCE = 11;
const wide = (body: Parameters<typeof pose>[0]): Pose => ({ ...pose(body), stance: STANCE });

// The back swing: the body is a bow, the chest is in front of the bar, the legs are long and behind.
const ARCH = wide({ swing: -8, lean: 8, thigh: -26, shin: -26, flex: 10, bend: -26, head: 6 });
// The knees start to rise, the heels stay behind.
const FOLD = wide({ swing: 7.5, lean: -4, thigh: 50, shin: -20, flex: 15, bend: 6, head: 0 });
const TUCK = wide({ swing: 20, lean: -34, thigh: 150, shin: 50, flex: 20, bend: 24, head: 10 });
// The touch. With long arms, a knee reaches the elbow only with the hips about as high as the shoulders: the shoulders
// are far behind the bar, the back is round, and the chin comes in: the eyes look at the knees.
const TOP = wide({ swing: 36, lean: -72, thigh: 214, shin: 94, flex: 20, bend: 30, head: 24 });
// The way down: the legs open a little, and the feet go down and back.
const LOOSE = wide({ swing: 24, lean: -44, thigh: 150, shin: 72, flex: 25, bend: 24, head: 10 });
const LONG = wide({ swing: 13.5, lean: -12, thigh: 62, shin: 32, flex: 18, bend: 8, head: 0 });
const HANG = wide({ swing: 1, lean: 0, thigh: 6, shin: 2, flex: 12, bend: -8, head: 0 });

const SIDE: View = { label: "Seite", yaw: 0, box: [6, -18, 172, 266] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-65, -18, 130, 284] };

export const KNEES_TO_ELBOWS: Exercise = {
  key: "knees-to-elbows",
  title: "Knees-to-elbows",
  equipment: { kind: "pullupbar", ...BAR },
  views: [SIDE, FRONT],
  ground: false,
  start: ARCH,
  steps: [
    {
      to: TOP,
      seconds: 0.78,
      label: "Knie hoch",
      via: [FOLD, TUCK],
      follow: "feet",
      ease: "soft",
      anchor: "hands",
      legs: "fk",
    },
    { to: TOP, seconds: 0.06, label: "Knie an den Ellbogen" },
    {
      to: ARCH,
      seconds: 0.82,
      label: "Absenken",
      via: [LOOSE, LONG, HANG],
      follow: "feet",
      ease: "soft",
      anchor: "hands",
      legs: "fk",
    },
    { to: ARCH, seconds: 0.06, label: "Rückschwung" },
  ],
};
