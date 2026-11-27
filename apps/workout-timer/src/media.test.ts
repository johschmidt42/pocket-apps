import { afterEach, describe, expect, it, vi } from "vitest";
import { createMedia, type MediaActions, silentWav } from "./media.ts";
import type { NowPlaying } from "./now-playing.ts";

const WORK: NowPlaying = {
  title: "Arbeit · Runde 2 von 8",
  subtitle: "Tabata 8 × 20 s / 10 s",
  playing: true,
  durationMs: 20_000,
  positionMs: 5_000,
};

/** Acts like the Media Session API of Chrome. jsdom does not have it. */
function fakeSession({ refuse = [] }: { refuse?: string[] } = {}) {
  const handlers = new Map<string, (() => void) | null>();
  const session = {
    metadata: null as unknown,
    playbackState: "none",
    setPositionState: vi.fn(),
    setActionHandler: vi.fn((action: string, handler: (() => void) | null) => {
      if (refuse.includes(action)) throw new TypeError(`Unknown action: ${action}`);
      handlers.set(action, handler);
    }),
  };
  Object.defineProperty(navigator, "mediaSession", { value: session, configurable: true });
  vi.stubGlobal(
    "MediaMetadata",
    class {
      init: MediaMetadataInit;
      constructor(init: MediaMetadataInit) {
        this.init = init;
      }
    },
  );
  const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockReturnValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockReturnValue(undefined);
  return { session, handlers, play, pause };
}

function actions(): MediaActions {
  return { pause: vi.fn(), play: vi.fn(), stop: vi.fn() };
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "mediaSession");
});

describe("silentWav", () => {
  it("is a WAV file with silence of the given length", () => {
    const bytes = silentWav(2);
    const text = (from: number) => String.fromCharCode(...bytes.slice(from, from + 4));

    expect(text(0)).toBe("RIFF");
    expect(text(8)).toBe("WAVE");
    expect(text(36)).toBe("data");
    // 8000 samples per second, one byte each, after a header of 44 bytes.
    expect(bytes.length).toBe(44 + 16_000);
    expect(new Set(bytes.slice(44))).toEqual(new Set([128]));
  });
});

describe("createMedia", () => {
  it("does nothing without the Media Session API", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    const media = createMedia({ artwork: "icon.png", album: "Workout Timer" });

    media.start(actions());
    media.show(WORK);
    media.clear();

    expect(play).not.toHaveBeenCalled();
  });

  it("does nothing before the start", () => {
    const { session } = fakeSession();
    const media = createMedia({ artwork: "icon.png", album: "Workout Timer" });

    media.show(WORK);
    media.clear();

    expect(session.metadata).toBeNull();
  });

  it("plays silence and shows the phase with its progress", () => {
    const { session, handlers, play } = fakeSession();
    const media = createMedia({ artwork: "https://example.org/icon.png", album: "Workout Timer" });
    const buttons = actions();

    media.start(buttons);
    media.show(WORK);

    expect(play).toHaveBeenCalled();
    expect(session.metadata).toEqual({
      init: {
        title: "Arbeit · Runde 2 von 8",
        artist: "Tabata 8 × 20 s / 10 s",
        album: "Workout Timer",
        artwork: [{ src: "https://example.org/icon.png", sizes: "512x512", type: "image/png" }],
      },
    });
    expect(session.playbackState).toBe("playing");
    expect(session.setPositionState).toHaveBeenLastCalledWith({
      duration: 20,
      position: 5,
      playbackRate: 1,
    });

    handlers.get("pause")?.();
    handlers.get("play")?.();
    handlers.get("stop")?.();
    expect(buttons.pause).toHaveBeenCalledOnce();
    expect(buttons.play).toHaveBeenCalledOnce();
    expect(buttons.stop).toHaveBeenCalledOnce();
  });

  it("pauses the audio during a pause and shows no bar without an end", () => {
    const { session, pause } = fakeSession();
    const media = createMedia({ artwork: "icon.png", album: "Workout Timer" });
    media.start(actions());

    media.show({ ...WORK, playing: false, durationMs: null });

    expect(pause).toHaveBeenCalled();
    expect(session.playbackState).toBe("paused");
    expect(session.setPositionState).toHaveBeenLastCalledWith();
  });

  it("removes the controls at the end", () => {
    const { session, handlers } = fakeSession();
    const media = createMedia({ artwork: "icon.png", album: "Workout Timer" });
    media.start(actions());
    media.show(WORK);

    media.clear();

    expect(session.metadata).toBeNull();
    expect(session.playbackState).toBe("none");
    expect(handlers.get("pause")).toBeNull();
    // A second clear does nothing.
    media.clear();
    expect(session.playbackState).toBe("none");
  });

  it("works when the browser refuses a button or the audio", async () => {
    const { play } = fakeSession({ refuse: ["stop"] });
    play.mockRejectedValue(new DOMException("No audio without a click.", "NotAllowedError"));
    const media = createMedia({ artwork: "icon.png", album: "Workout Timer" });

    media.start(actions());
    media.show(WORK);
    await Promise.resolve();

    expect(play).toHaveBeenCalledTimes(2);
  });

  it("pauses the timer when Android pauses the audio, not after its own pause", () => {
    const { play } = fakeSession();
    const media = createMedia({ artwork: "icon.png", album: "Workout Timer" });
    const buttons = actions();
    media.start(buttons);
    const audio = play.mock.contexts[0];
    if (!(audio instanceof HTMLMediaElement)) throw new Error("No audio element.");

    // A call or another app takes the audio.
    audio.dispatchEvent(new Event("pause"));
    expect(buttons.pause).toHaveBeenCalledOnce();

    // The app pauses the audio itself.
    media.show({ ...WORK, playing: false });
    audio.dispatchEvent(new Event("pause"));
    expect(buttons.pause).toHaveBeenCalledOnce();
  });
});
