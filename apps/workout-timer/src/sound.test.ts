import { describe, expect, it, vi } from "vitest";
import { createSound } from "./sound.ts";

/** A small stand-in for the Web Audio API of the browser. jsdom has none. */
function stubAudio(state: AudioContextState) {
  const oscillators: { hz: number; start: number; stop: number }[] = [];
  const resume = vi.fn(() => Promise.resolve());
  class FakeAudioContext {
    state = state;
    currentTime = 5;
    destination = {};
    resume = resume;
    createGain() {
      const param = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
      return { gain: param, connect: (node: unknown) => node };
    }
    createOscillator() {
      const tone = { hz: 0, start: 0, stop: 0 };
      oscillators.push(tone);
      return {
        frequency: {
          set value(hz: number) {
            tone.hz = hz;
          },
        },
        connect: (node: unknown) => node,
        start: (time: number) => {
          tone.start = time;
        },
        stop: (time: number) => {
          tone.stop = time;
        },
      };
    }
  }
  vi.stubGlobal("AudioContext", FakeAudioContext);
  return { oscillators, resume };
}

describe("createSound", () => {
  it("is silent before unlock", () => {
    const { oscillators } = stubAudio("running");
    const sound = createSound();

    sound.play("work");

    expect(oscillators).toEqual([]);
  });

  it("plays a tone of the right pitch and length after unlock", () => {
    const { oscillators, resume } = stubAudio("running");
    const sound = createSound();

    sound.unlock();
    sound.play("count");
    sound.play("end");

    expect(resume).not.toHaveBeenCalled();
    expect(oscillators).toEqual([
      { hz: 660, start: 5, stop: 5.15 },
      { hz: 990, start: 5, stop: 6.2 },
    ]);
  });

  it("resumes a suspended audio context", () => {
    const { resume } = stubAudio("suspended");
    const sound = createSound();

    sound.unlock();

    expect(resume).toHaveBeenCalled();
  });

  it("is silent without the Web Audio API", () => {
    const sound = createSound();

    sound.unlock();

    expect(() => {
      sound.play("rest");
    }).not.toThrow();
  });
});
