import { useEffect, useState } from "react";

/** The longest step of the clock, in seconds. After a stall, the figures go on and do not jump. */
const LONGEST_STEP = 0.1;

/**
 * Seconds that run while `running` is true, `speed` times as fast as real time. They stay where
 * they are during a pause.
 */
export function useAnimationClock(running: boolean, speed: number): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    let last: number | null = null;
    let frame = requestAnimationFrame(function tick(now) {
      if (last !== null) {
        const step = Math.min((now - last) / 1000, LONGEST_STEP) * speed;
        setSeconds((value) => value + step);
      }
      last = now;
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [running, speed]);
  return seconds;
}
