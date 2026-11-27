// The media controls of the phone (Media Session API). Android shows the timer in the quick
// settings and on the lock screen, like music: the phase, a progress bar and the buttons for
// pause and play.
//
// Android shows the controls only while an audio element plays. Thus the timer plays a silent
// audio file in a loop. The cost: other audio (for example music) pauses. See "Media controls of
// the phone (workout-timer)" in docs/decisions.md.

import type { NowPlaying } from "./now-playing.ts";

/** What the buttons of the media controls do. `stop` ends the workout. */
export type MediaActions = { pause: () => void; play: () => void; stop: () => void };

export type Media = {
  /**
   * Starts the silent audio and connects the buttons. Call it in the click handler of the start
   * button: browsers play audio only after a click of the user.
   */
  start: (actions: MediaActions) => void;
  /** Shows the phase of the timer. During a pause, the audio pauses too. */
  show: (state: NowPlaying) => void;
  /** Removes the media controls and stops the audio. */
  clear: () => void;
};

/** The length of the silent audio file. Chrome shows no controls for audio below 5 seconds. */
const SILENCE_SECONDS = 10;
const SAMPLE_RATE = 8000;

/** A WAV file with silence: 8-bit mono PCM. In 8-bit PCM, the value 128 is silence. */
export function silentWav(seconds: number): Uint8Array<ArrayBuffer> {
  const samples = seconds * SAMPLE_RATE;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true); // The size of the format block.
  view.setUint16(20, 1, true); // PCM.
  view.setUint16(22, 1, true); // Mono.
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE, true); // Bytes per second.
  view.setUint16(32, 1, true); // Bytes per sample.
  view.setUint16(34, 8, true); // Bits per sample.
  text(36, "data");
  view.setUint32(40, samples, true);
  bytes.fill(128, 44);
  return bytes;
}

/**
 * Connects a button (or removes it with `null`). Ignores a refused action: not every browser has
 * every button.
 */
function setAction(
  session: MediaSession,
  action: MediaSessionAction,
  handler: (() => void) | null,
) {
  try {
    session.setActionHandler(action, handler);
  } catch {
    // This browser does not know the action.
  }
}

/** The buttons that the app connects. */
const ACTIONS: MediaSessionAction[] = ["play", "pause", "stop"];

/**
 * The media controls of the browser. Without the Media Session API (for example in jsdom or in
 * older browsers), it does nothing.
 *
 * @param artwork The address of the app icon.
 * @param album The title of the app.
 */
export function createMedia({ artwork, album }: { artwork: string; album: string }): Media {
  let audio: HTMLAudioElement | null = null;
  let audioUrl: string | null = null;
  let actions: MediaActions | null = null;
  /** True while the app wants the audio to play. Then a pause comes from outside. */
  let wanted = false;
  const session = "mediaSession" in navigator ? navigator.mediaSession : null;

  const playSilence = (element: HTMLAudioElement) => {
    wanted = true;
    element.play().catch(() => {
      // The browser refused the audio. The timer works, only without the media controls.
    });
  };

  const pauseSilence = (element: HTMLAudioElement) => {
    wanted = false;
    element.pause();
  };

  // Android pauses the audio for a call or for another app with audio (for example Spotify).
  // Then the timer pauses too: the screen and the media controls agree.
  const onOutsidePause = () => {
    if (wanted) actions?.pause();
  };

  const start = (next: MediaActions) => {
    if (session === null) return;
    actions = next;
    audioUrl ??= URL.createObjectURL(new Blob([silentWav(SILENCE_SECONDS)], { type: "audio/wav" }));
    if (audio === null) {
      audio = new Audio(audioUrl);
      audio.loop = true;
      audio.addEventListener("pause", onOutsidePause);
    }
    playSilence(audio);
    setAction(session, "play", next.play);
    setAction(session, "pause", next.pause);
    setAction(session, "stop", next.stop);
  };

  const show = (state: NowPlaying) => {
    if (session === null || audio === null) return;
    session.metadata = new MediaMetadata({
      title: state.title,
      artist: state.subtitle,
      album,
      artwork: [{ src: artwork, sizes: "512x512", type: "image/png" }],
    });
    session.playbackState = state.playing ? "playing" : "paused";
    if (state.playing) playSilence(audio);
    else pauseSilence(audio);
    if (state.durationMs === null || state.durationMs === 0) {
      // No end: no progress bar.
      session.setPositionState();
    } else {
      session.setPositionState({
        duration: state.durationMs / 1000,
        position: state.positionMs / 1000,
        playbackRate: 1,
      });
    }
  };

  const clear = () => {
    if (session === null || audio === null) return;
    pauseSilence(audio);
    audio.removeEventListener("pause", onOutsidePause);
    // Without a source, the browser ends the media session and removes the controls.
    audio.removeAttribute("src");
    audio.load();
    audio = null;
    actions = null;
    if (audioUrl !== null) URL.revokeObjectURL(audioUrl);
    audioUrl = null;
    session.metadata = null;
    session.playbackState = "none";
    session.setPositionState();
    for (const action of ACTIONS) setAction(session, action, null);
  };

  return { start, show, clear };
}
