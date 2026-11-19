import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useSubPage } from "./sub-page.ts";

const root = document.documentElement;

/** Each test starts on the main page, without a hash and without an entry of the hook. */
beforeEach(() => {
  window.history.replaceState(null, "", "/app.html?x=1");
  root.scrollTop = 0;
});

describe("useSubPage", () => {
  it("starts on the main page without a hash", () => {
    const { result } = renderHook(useSubPage);
    expect(result.current.page).toBeNull();
  });

  it("starts on the sub-page of the hash", () => {
    window.history.replaceState(null, "", "/app.html#fran%20x");
    const { result } = renderHook(useSubPage);
    expect(result.current.page).toBe("fran x");
  });

  it("starts on the main page with a broken hash", () => {
    window.history.replaceState(null, "", "/app.html#%E0");
    const { result } = renderHook(useSubPage);
    expect(result.current.page).toBeNull();
  });

  it("opens a sub-page from its top and goes back to the place of the main page", async () => {
    const { result } = renderHook(useSubPage);
    root.scrollTop = 300;

    act(() => {
      result.current.open("murph 2");
    });
    expect(result.current.page).toBe("murph 2");
    expect(window.location.hash).toBe("#murph%202");
    expect(root.scrollTop).toBe(0);

    act(() => {
      result.current.back();
    });
    // At once: a second click on the button cannot go back one more step.
    expect(result.current.page).toBeNull();
    expect(root.scrollTop).toBe(300);
    await waitFor(() => {
      expect(window.location.hash).toBe("");
    });
    expect(window.location.search).toBe("?x=1");
    expect(result.current.page).toBeNull();
    expect(root.scrollTop).toBe(300);
  });

  it("follows the back and forward buttons of the browser", async () => {
    const { result } = renderHook(useSubPage);
    act(() => {
      result.current.open("fran");
    });

    act(() => {
      window.history.back();
    });
    await waitFor(() => {
      expect(result.current.page).toBeNull();
    });

    act(() => {
      window.history.forward();
    });
    await waitFor(() => {
      expect(result.current.page).toBe("fran");
    });
  });

  it("replaces an open sub-page, so that back still shows the main page", async () => {
    const { result } = renderHook(useSubPage);
    root.scrollTop = 300;
    act(() => {
      result.current.open("fran");
    });
    const length = window.history.length;
    root.scrollTop = 50;

    act(() => {
      result.current.open("murph");
    });
    expect(result.current.page).toBe("murph");
    expect(window.location.hash).toBe("#murph");
    expect(window.history.length).toBe(length);
    expect(root.scrollTop).toBe(0);

    act(() => {
      result.current.back();
    });
    await waitFor(() => {
      expect(result.current.page).toBeNull();
    });
    expect(root.scrollTop).toBe(300);
  });

  it("follows a hash that the user types into the address bar", async () => {
    const { result } = renderHook(useSubPage);
    root.scrollTop = 100;

    act(() => {
      window.location.hash = "#cindy";
    });
    await waitFor(() => {
      expect(result.current.page).toBe("cindy");
    });
    expect(root.scrollTop).toBe(0);
  });

  it("puts the main page before a sub-page of a bookmark", async () => {
    window.history.replaceState(null, "", "/app.html?x=1#fran");
    const length = window.history.length;
    const { result } = renderHook(useSubPage);
    expect(result.current.page).toBe("fran");
    expect(window.history.length).toBe(length + 1);

    // Only one level: the next sub-page replaces this one.
    act(() => {
      result.current.open("murph");
    });
    expect(window.history.length).toBe(length + 1);

    act(() => {
      result.current.back();
    });
    await waitFor(() => {
      expect(window.location.hash).toBe("");
    });
    expect(window.location.search).toBe("?x=1");
    expect(result.current.page).toBeNull();
  });

  it("adds no entry after a reload of a sub-page", () => {
    window.history.replaceState({ subPage: true, scrollTop: 0 }, "", "/app.html#fran");
    const length = window.history.length;
    const { result } = renderHook(useSubPage);
    expect(result.current.page).toBe("fran");
    expect(window.history.length).toBe(length);
  });

  it("sets the scroll position itself while it is in use", () => {
    const { unmount } = renderHook(useSubPage);
    expect(window.history.scrollRestoration).toBe("manual");
    unmount();
    expect(window.history.scrollRestoration).toBe("auto");
  });
});
