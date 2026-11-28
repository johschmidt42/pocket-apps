import { BackSide, Color, ShaderMaterial } from "three";

/** The width of the outline in field units. */
const OUTLINE_WIDTH = 1.4;

let material: ShaderMaterial | undefined;

/**
 * The dark outline of the cartoon look. All figures share it.
 * It draws a second copy of a shape, a little larger, and only the inner side of this copy.
 * So the copy shows only around the shape. The copy grows along the surface direction after the
 * shape has its final size. Thus the outline has the same width on a ball, an egg and a flat disc.
 */
export function outlineMaterial(): ShaderMaterial {
  material ??= new ShaderMaterial({
    side: BackSide,
    uniforms: { width: { value: OUTLINE_WIDTH }, color: { value: new Color("#1a0d10") } },
    vertexShader: `
      uniform float width;
      void main() {
        vec4 place = modelViewMatrix * vec4(position, 1.0);
        place.xyz += normalize(normalMatrix * normal) * width;
        gl_Position = projectionMatrix * place;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      void main() {
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  return material;
}
