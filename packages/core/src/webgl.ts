/**
 * True if the browser can draw with WebGL 2, the 3D graphics interface that three.js uses.
 * An app with a WebGL picture asks this first and shows a German message if the answer is no.
 * The check makes a test context and gives it back at once: a browser allows only a few contexts.
 */
export function supportsWebGL2(): boolean {
  const context = document.createElement("canvas").getContext("webgl2");
  if (context === null) return false;
  context.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}
