// The tones of the timer, made with the Web Audio API. No audio files.

import type { Cue } from "./timer.ts";

export type Sound = {
  /**
   * Prepares the audio. Call it in the click handler of the start button: browsers (above all
   * Safari on the iPhone) play audio only after a click of the user.
   */
  unlock: () => void;
  play: (cue: Cue) => void;
};

/** The pitch in Hz and the length in seconds of each tone. */
const TONES: Record<Cue, { hz: number; seconds: number }> = {
  count: { hz: 660, seconds: 0.15 },
  work: { hz: 990, seconds: 0.6 },
  rest: { hz: 440, seconds: 0.6 },
  end: { hz: 990, seconds: 1.2 },
};

/** The tones of the browser. Without the Web Audio API (for example in jsdom), it is silent. */
export function createSound(): Sound {
  let context: AudioContext | null = null;

  const unlock = () => {
    if (typeof AudioContext === "undefined") return;
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
  };

  const play = (cue: Cue) => {
    if (context === null) return;
    const { hz, seconds } = TONES[cue];
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = hz;
    // A short fade in and out. Without it, the tone clicks.
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.4, start + 0.01);
    gain.gain.setValueAtTime(0.4, start + seconds - 0.05);
    gain.gain.linearRampToValueAtTime(0, start + seconds);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds);
  };

  return { unlock, play };
}
