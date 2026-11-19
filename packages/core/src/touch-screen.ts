/** True on a device with a touch screen as its main pointer, for example a phone or a tablet. */
export function hasTouchScreen(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
}
