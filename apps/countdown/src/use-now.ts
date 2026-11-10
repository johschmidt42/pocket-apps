import { useEffect, useState } from "react";

export type Clock = () => Date;

/** The clock of the computer. A constant, so that the timer does not start again on each render. */
export const systemClock: Clock = () => new Date();

/** The current time. It changes every second. Tests can give another clock. */
export function useNow(clock: Clock = systemClock): Date {
  const [now, setNow] = useState(clock);
  // Sync with the system clock: a timer that ticks each second.
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(clock());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [clock]);
  return now;
}
