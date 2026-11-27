import { expect } from "@playwright/test";
import { releaseUrl, test } from "./helpers.ts";

// The media controls of the phone come from the Media Session API. Chromium on a computer has the
// API too: the test reads what the app gives to it.
test("shows the running timer in the media controls", async ({ page, pageErrors }) => {
  // Remembers the audio element as "lastPlayed". It is not in the page.
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- The wrapper calls it with its element.
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      Reflect.set(window, "lastPlayed", this);
      return play.call(this);
    };
  });
  await page.goto(releaseUrl("workout-timer.html"));
  const media = () =>
    page.evaluate(() => {
      const isPlaying = (element: unknown) =>
        element instanceof HTMLMediaElement && !element.paused;
      return {
        title: navigator.mediaSession.metadata?.title ?? null,
        artist: navigator.mediaSession.metadata?.artist ?? null,
        artwork: navigator.mediaSession.metadata?.artwork[0]?.src ?? null,
        state: navigator.mediaSession.playbackState,
        audioPlays: isPlaying(Reflect.get(window, "lastPlayed")),
      };
    });

  await page.getByRole("radio", { name: /^Tabata/ }).click();
  await page.getByRole("button", { name: "Start" }).click();

  // The silent audio plays: without it, Android shows no media controls.
  await expect.poll(media).toEqual({
    title: "Gleich geht’s los",
    artist: "Tabata 8 × 20 s / 10 s",
    artwork: releaseUrl("icons/workout-timer-512.png"),
    state: "playing",
    audioPlays: true,
  });

  await page.getByRole("button", { name: "Pause" }).click();
  await expect.poll(media).toMatchObject({ state: "paused", audioPlays: false });

  await page.getByRole("button", { name: "Weiter" }).click();
  await expect.poll(media).toMatchObject({ state: "playing", audioPlays: true });

  await page.getByRole("button", { name: "Beenden" }).click();
  await expect.poll(media).toEqual({
    title: null,
    artist: null,
    artwork: null,
    state: "none",
    audioPlays: false,
  });
  expect(pageErrors).toEqual([]);
});
