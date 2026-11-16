import { useEffect, useState, type RefObject } from "react";

/**
 * The width of an element in pixels. It changes when the window or the layout changes.
 * It is 0 before the first measurement and in tests without layout (jsdom).
 */
export function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setWidth(element.getBoundingClientRect().width);
    });
    observer.observe(element);
    setWidth(element.getBoundingClientRect().width);
    return () => {
      observer.disconnect();
    };
  }, [ref]);
  return width;
}
