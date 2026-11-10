import type { ParamSymbol, Params } from "./attractors.ts";

export function lerpParams(from: Params, to: Params, t: number): Params {
  return {
    a: from.a + (to.a - from.a) * t,
    b: from.b + (to.b - from.b) * t,
    c: from.c + (to.c - from.c) * t,
    d: from.d + (to.d - from.d) * t,
    e: from.e + (to.e - from.e) * t,
    f: from.f + (to.f - from.f) * t,
  };
}

export type Drift = {
  /** Moves the time forward by `seconds`. Returns the current parameters. */
  update: (seconds: number) => Params;
};

/**
 * Slow change of the parameters, like on zensical.org.
 * The first move goes from the first to the second profile in 120 seconds.
 * Each next move goes to a random mix of two profiles in 180 to 360 seconds.
 * With one profile, the parameters stay the same.
 */
export function createDrift(profiles: readonly [Params, ...Params[]], random: () => number): Drift {
  const [start, ...others] = profiles;
  const [next] = others;
  if (next === undefined) return { update: () => start };

  let source = start;
  let target = next;
  let elapsed = 0;
  let duration = 120;
  let first = true;

  function pick(): Params {
    return profiles[Math.floor(random() * profiles.length)] ?? start;
  }

  return {
    update(seconds) {
      elapsed += seconds;
      while (elapsed >= duration) {
        elapsed -= duration;
        source = target;
        target = lerpParams(pick(), pick(), 0.15 + random() * 0.7);
        duration = 180 + random() * 180;
        first = false;
      }
      const t = elapsed / duration;
      // The first move starts at full speed, so that the change is visible at once.
      const eased = first ? Math.sin((t * Math.PI) / 2) : t ** 3 * (t * (t * 6 - 15) + 10);
      return lerpParams(source, target, eased);
    },
  };
}

/** The values of the shown parameters, for the text under the picture. */
export function paramValues(
  params: Params,
  symbols: readonly ParamSymbol[],
): { symbol: string; value: number }[] {
  return symbols.map(({ key, symbol }) => ({ symbol, value: params[key] }));
}
