/** The vertical field of view in a wide picture, in degrees. */
const WIDE_FOV = 75;
const MAX_FOV = 120;

/**
 * The vertical field of view for a picture with this aspect ratio (width / height).
 * In a tall picture, the field of view grows, so that the attractor still fits in the width.
 */
export function fieldOfView(aspect: number): number {
  if (aspect >= 1) return WIDE_FOV;
  const halfWide = (WIDE_FOV / 2) * (Math.PI / 180);
  const fov = 2 * Math.atan(Math.tan(halfWide) / aspect) * (180 / Math.PI);
  return Math.min(fov, MAX_FOV);
}
