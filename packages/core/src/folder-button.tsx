import { Button } from "@pocket-apps/ui/components/button";
import { useRef, type ComponentProps } from "react";
import { inputFiles } from "./input-files.ts";

export type FolderButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "type"> & {
  /** The name of the hidden folder field, for screen readers and tests, for example "Bildordner". */
  inputLabel: string;
  /**
   * Gets all files in the picked folder and in its subfolders. `file.webkitRelativePath` is the
   * path of a file, with the name of the picked folder first: "Urlaub/2024/bild.jpg".
   * The list is empty for an empty folder. Not called if the person cancels.
   */
  onFiles: (files: File[]) => void;
};

/**
 * A button that opens the folder dialog of the system and gives all files of the picked folder
 * to the app. It only reads. The app keeps nothing: after a reload, the person picks the folder
 * again. Apps use it instead of their own folder field, so that all file dialogs are in core.
 * It uses `<input webkitdirectory>`. Thus it also works in Firefox and Safari.
 * Chrome asks before it gives the files to the page and calls this "upload" ("hochladen"),
 * but nothing leaves the computer.
 */
export function FolderButton({ inputLabel, onFiles, children, ...props }: FolderButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <Button
        type="button"
        {...props}
        onClick={() => {
          inputRef.current?.click();
        }}
      >
        {children}
      </Button>
      <input
        ref={(node) => {
          inputRef.current = node;
          // React has no prop for this attribute. The DOM property works in all browsers.
          if (node) node.webkitdirectory = true;
        }}
        type="file"
        multiple
        aria-label={inputLabel}
        tabIndex={-1}
        className="hidden"
        onChange={(event) => {
          const files = inputFiles(event.target);
          // Empty the field: then the same folder can be picked again.
          event.target.value = "";
          onFiles(files);
        }}
      />
    </>
  );
}
