import { Button } from "@pocket-apps/ui/components/button";
import { useRef, type ComponentProps } from "react";
import { inputFiles } from "./input-files.ts";

export type FileButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "type"> & {
  /** The file types that the dialog shows, for example "image/*". */
  accept: string;
  /** The name of the hidden file field, for screen readers and tests, for example "Foto-Datei". */
  inputLabel: string;
  /** Gets the file that the person picked. Not called if the person cancels. */
  onFile: (file: File) => void;
  /**
   * Opens the camera instead of the file dialog, on phones and tablets: "environment" is the
   * camera on the back. Computers ignore it. See `CameraButton`.
   */
  capture?: "environment" | "user";
};

/**
 * A button that opens the file dialog of the system and gives the picked file to the app.
 * Apps use it instead of their own file field, so that all file dialogs are in core.
 * It only reads a file that the person picks. To keep the file, write it into the data folder
 * (`useDataFile().files`).
 */
export function FileButton({
  accept,
  inputLabel,
  onFile,
  capture,
  children,
  ...props
}: FileButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
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
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture}
        aria-label={inputLabel}
        tabIndex={-1}
        className="hidden"
        onChange={(event) => {
          // The field takes one file (no `multiple`). A cancel sends no change event.
          const files = inputFiles(event.target);
          // Empty the field: then the same file can be picked again.
          event.target.value = "";
          for (const file of files) onFile(file);
        }}
      />
    </>
  );
}
