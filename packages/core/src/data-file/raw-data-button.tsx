import { Button } from "@pocket-apps/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@pocket-apps/ui/components/tooltip";
import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import { RawDataDialog, type RawFile } from "./raw-data-dialog.tsx";

/** The open raw view: the file, and whether the app had unsaved changes when it opened. */
type OpenView = { file: RawFile; unsaved: boolean };

export type RawDataButtonProps = {
  /** The visible text of the button. */
  children: ReactNode;
  /** The accessible name of the button. It must start with the visible text. */
  label: string;
  /**
   * Optional. A tooltip for the mouse. It shows at once, not after the delay of the `title`
   * attribute. Use it when the visible text does not tell what the button does.
   */
  hint?: string;
  variant: ComponentProps<typeof Button>["variant"];
  size: ComponentProps<typeof Button>["size"];
  className?: string;
  fileName: string;
  folderName: string;
  /** `true` if the app has changes that are not in the file yet. */
  unsaved: boolean;
  /** Reads the data file. */
  readRaw: () => Promise<RawFile>;
};

/**
 * A button that shows the raw data of the data file in a dialog. Each click reads the file again.
 * The note about unsaved changes tells the state at the moment of the click, like the text.
 */
export function RawDataButton({
  children,
  label,
  hint,
  variant,
  size,
  className,
  fileName,
  folderName,
  unsaved,
  readRaw,
}: RawDataButtonProps) {
  const [view, setView] = useState<OpenView | null>(null);
  // Each click and each close gets a new number. A read that ends late (after a close, or after
  // a newer click) has an old number, and the dialog ignores its result.
  const request = useRef(0);

  function open() {
    request.current += 1;
    const current = request.current;
    setView({ file: { kind: "loading" }, unsaved });
    void readRaw().then((file) => {
      if (current === request.current) setView((shown) => shown && { ...shown, file });
    });
  }

  const button = (
    <Button
      variant={variant}
      size={size}
      // The hand cursor tells that a click opens something.
      className={`cursor-pointer ${className ?? ""}`}
      aria-label={label}
      aria-haspopup="dialog"
      onClick={open}
    >
      {children}
    </Button>
  );

  return (
    <>
      {hint === undefined ? (
        button
      ) : (
        // An own provider: not every app has one. Its delay is 0.
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="bottom">{hint}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <RawDataDialog
        file={view?.file ?? null}
        fileName={fileName}
        folderName={folderName}
        unsaved={view?.unsaved ?? false}
        onClose={() => {
          request.current += 1;
          setView(null);
        }}
      />
    </>
  );
}
