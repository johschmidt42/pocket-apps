/**
 * The files of a file field. The DOM type allows `null` (a field that is not of type "file"),
 * so this function gives an empty list then.
 */
export function inputFiles(input: Pick<HTMLInputElement, "files">): File[] {
  return input.files ? Array.from(input.files) : [];
}
