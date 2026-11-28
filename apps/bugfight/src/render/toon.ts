import {
  DataTexture,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  type ColorRepresentation,
} from "three";

let steps: DataTexture | undefined;

/**
 * The three steps of light of the cartoon look: shade, middle, light. All toon materials share them.
 * The picture has 4 parts, and the shade has two of them: a surface that looks away from the light is in the shade,
 * one that looks at the light at an angle is in the middle, and the rest is light.
 */
function lightSteps(): DataTexture {
  if (steps === undefined) {
    steps = new DataTexture(new Uint8Array([110, 110, 190, 255]), 4, 1, RedFormat);
    steps.minFilter = NearestFilter;
    steps.magFilter = NearestFilter;
    steps.needsUpdate = true;
  }
  return steps;
}

/** A material with hard steps of light, as in a cartoon. */
export function toonMaterial(color: ColorRepresentation): MeshToonMaterial {
  return new MeshToonMaterial({ color, gradientMap: lightSteps() });
}
