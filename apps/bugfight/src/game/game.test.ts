import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Moment, View } from "../render/view.ts";
import type { GameState } from "../sim/state.ts";
import { createGame, readOptions, type Game, type GameOptions } from "./game.ts";

let game: Game | undefined;

afterEach(() => {
  game?.dispose();
  game = undefined;
  document.body.replaceChildren();
});

/** A picture without WebGL. It records what the game asks for. */
function setup(options: GameOptions = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const view = {
    canvas: document.createElement("canvas"),
    update: vi.fn<(state: GameState, moment: Moment) => void>(),
    draw: vi.fn<() => void>(),
    reset: vi.fn<() => void>(),
    dispose: vi.fn<() => void>(),
  } satisfies View;
  // jsdom has no layout. The picture of the field is 800 x 450 pixels at the top left of the window.
  vi.spyOn(view.canvas, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 450,
    width: 800,
    height: 450,
    toJSON: () => ({}),
  });
  const created = createGame(container, options, () => view);
  game = created;
  /** The state of the sim that the game showed last. */
  const state = () => view.update.mock.lastCall![0];
  return { game: created, view, container, state, user: userEvent.setup() };
}

/** Waits until the game runs and the sim made some ticks. */
async function untilTick(state: () => GameState, tick: number): Promise<void> {
  await vi.waitFor(() => {
    expect(state().tick).toBeGreaterThanOrEqual(tick);
  });
}

describe("the options in the address", () => {
  it("are all off without a query", () => {
    expect(readOptions("")).toEqual({ debug: false, hitAreas: false, bot: false });
  });

  it("come from the query", () => {
    expect(readOptions("?debug&hit&bot&level=5&spots=1&weapon=seeds")).toEqual({
      debug: true,
      hitAreas: true,
      bot: true,
      level: 5,
      spots: 1,
      weapon: "seeds",
    });
    // An unknown weapon and a value that is no number are no options.
    expect(readOptions("?weapon=laser&level=abc&spots=")).toEqual({
      debug: false,
      hitAreas: false,
      bot: false,
    });
  });
});

describe("the game", () => {
  it("shows the title first: the picture runs, the sim waits", async () => {
    const { game, view, container, state } = setup();
    expect(game.info().screen).toBe("title");
    expect(container.dataset.screen).toBe("title");
    await vi.waitFor(() => {
      expect(view.draw.mock.calls.length).toBeGreaterThan(2);
    });
    expect(state().tick).toBe(0);
    // The garden moves on behind the title.
    expect(view.update.mock.lastCall![1].seconds).toBeGreaterThan(0);
  });

  it("starts the sim with the start, and tells each new value of a display", async () => {
    const { game, container, state, user } = setup();
    const listener = vi.fn();
    const stop = game.subscribe(listener);
    game.start();
    expect(game.info().screen).toBe("playing");
    expect(container.dataset.screen).toBe("playing");
    expect(listener).toHaveBeenCalledTimes(1);
    await untilTick(state, 5);

    // The player sprays: the pressure of the tank falls, and the displays get it.
    await user.keyboard("{ >}");
    await vi.waitFor(() => {
      expect(game.info().hud.pressure).toBeLessThan(100);
    });
    expect(listener.mock.calls.length).toBeGreaterThan(1);

    stop();
    const calls = listener.mock.calls.length;
    await user.keyboard("{/ }{Escape}");
    expect(game.info().screen).toBe("paused");
    expect(listener).toHaveBeenCalledTimes(calls);
  });

  it("holds the sim in the pause and goes on after it", async () => {
    const { game, view, state, user } = setup();
    game.start();
    await untilTick(state, 5);

    // The pointer is free in jsdom. Then the Esc key pauses the game.
    await user.keyboard("{Escape}");
    expect(game.info().screen).toBe("paused");
    const tick = state().tick;
    const pictures = view.draw.mock.calls.length;
    await vi.waitFor(() => {
      expect(view.draw.mock.calls.length).toBeGreaterThan(pictures + 2);
    });
    expect(state().tick).toBe(tick);
    // The picture stands still too.
    expect(view.update.mock.lastCall![1].seconds).toBe(0);

    game.singleTick();
    expect(state().tick).toBe(tick + 1);

    game.resume();
    expect(game.info().screen).toBe("playing");
    await untilTick(state, tick + 5);
  });

  it("makes a single tick only in the pause", async () => {
    const { game, state } = setup();
    game.singleTick();
    await vi.waitFor(() => {
      expect(state().tick).toBe(0);
    });
  });

  it("goes back to the title from the pause, with a new game", async () => {
    const { game, view, state, user } = setup();
    game.start();
    await untilTick(state, 10);
    game.quit();
    // The game runs. Only a paused game can end.
    expect(game.info().screen).toBe("playing");

    await user.keyboard("{Escape}");
    game.quit();
    expect(game.info().screen).toBe("title");
    expect(view.reset).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(state().tick).toBe(0);
    });
  });

  it("is won when the bot killed all ants, after a moment of slow motion", async () => {
    const { game, view, state } = setup({ bot: true, level: 10 });
    // The test does not wait for a real fight: the time runs 30 times as fast.
    game.setTimeFactor(30);
    game.start();
    await vi.waitFor(
      () => {
        expect(game.info().screen).toBe("won");
      },
      { timeout: 15000 },
    );
    expect(state().enemies).toHaveLength(0);
    const events = view.update.mock.calls.flatMap(([, moment]) => moment.events);
    expect(events).toContainEqual({ type: "wave-cleared" });

    // A new game: all ants are back, and the level of the debug panel stays.
    game.again();
    expect(game.info().screen).toBe("playing");
    expect(view.reset).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(state().enemies).toHaveLength(40);
    });
    expect(game.info().hud.level).toBe(10);
  }, 20000);

  it("is lost when Seven loses his last spot", async () => {
    const { game, state, user } = setup({ spots: 1 });
    game.setTimeFactor(30);
    game.start();
    // The pointer is at the center of the second row of the block. Seven goes there and waits,
    // and the block moves its ants into him.
    await user.pointer({ target: document.body, coords: { clientX: 400, clientY: 102.5 } });
    await vi.waitFor(
      () => {
        expect(game.info().screen).toBe("lost");
      },
      { timeout: 15000 },
    );
    expect(game.info().hud.spots).toBe(0);
    expect(state().over).toBe("lost");

    game.quit();
    expect(game.info().screen).toBe("title");
    expect(game.info().hud.spots).toBe(1);
  }, 20000);

  it("starts a new game only after a game that is over", () => {
    const { game, view } = setup();
    game.again();
    expect(game.info().screen).toBe("title");
    game.start();
    game.again();
    expect(game.info().screen).toBe("playing");
    expect(view.reset).not.toHaveBeenCalled();
  });

  it("changes the weapon with a key and shows the stones", async () => {
    const { game, state, user } = setup({ weapon: "seeds" });
    expect(game.info().hud.weapon).toBe("seeds");
    game.start();
    await untilTick(state, 5);
    await user.keyboard("{ >}");
    await vi.waitFor(() => {
      expect(game.info().hud.seeds).toBeLessThan(24);
    });
    await user.keyboard("{/ }1");
    await vi.waitFor(() => {
      expect(game.info().hud.weapon).toBe("spray");
    });
  });

  it("has the tools of the debug panel", async () => {
    const { game, view, state } = setup({ debug: true, hitAreas: true, level: 99 });
    expect(game.info()).toMatchObject({ debug: true, hitAreas: true, immortal: false });
    // A level out of the range counts as the nearest level.
    expect(game.info().hud.level).toBe(10);

    game.setLevel(3);
    game.setImmortal(true);
    game.setHitAreas(false);
    game.setTimeFactor(0.5);
    expect(game.info()).toMatchObject({ hitAreas: false, immortal: true, timeFactor: 0.5 });
    expect(game.info().hud.level).toBe(3);

    // With the open panel, the numbers come some times per second.
    game.start();
    await untilTick(state, 3);
    await vi.waitFor(() => {
      expect(game.info().stats.picturesPerSecond).toBeGreaterThan(0);
    });
    expect(game.info().stats).toMatchObject({ pointer: "free", enemies: 40 });
    expect(view.update.mock.lastCall![1].hitAreas).toBe(false);

    game.toggleDebug();
    expect(game.info().debug).toBe(false);
  });

  it("stops the picture and frees all at its end", async () => {
    const { game, view, container } = setup();
    await vi.waitFor(() => {
      expect(view.draw).toHaveBeenCalled();
    });
    game.dispose();
    expect(view.dispose).toHaveBeenCalledOnce();
    expect(container.dataset.screen).toBeUndefined();
    const pictures = view.draw.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(view.draw).toHaveBeenCalledTimes(pictures);
  });
});
