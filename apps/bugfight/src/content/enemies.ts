/** A kind of enemy. All lengths are in field units, all times in seconds. */
export type EnemyKind = {
  /** The radius of its hit area. */
  radius: number;
  hitPoints: number;
  spit: {
    /** One enemy in the formation spits one time in this time, on average. */
    everySeconds: number;
    /** The length of the spit, and the moment in it at which the drop leaves. They must fit the motion "spit" of the figure. */
    seconds: number;
    leaveSeconds: number;
    /** The speed and the radius of the drop. The drop falls straight down. */
    speed: number;
    radius: number;
  };
};

/** The flying ant. It spits drops of formic acid. */
export const ANT: EnemyKind = {
  radius: 20,
  hitPoints: 8,
  spit: { everySeconds: 30, seconds: 0.6, leaveSeconds: 0.4, speed: 300, radius: 8 },
};
