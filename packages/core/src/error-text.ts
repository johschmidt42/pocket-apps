/** The message of an error. A thrown value that is not an `Error` becomes text. */
export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
