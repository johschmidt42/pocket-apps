import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { jsonTokens, type JsonTokenKind } from "./json-tokens.ts";

/** The state of the raw view: the file is loading, it has a text, it does not exist, or an error. */
export type RawFile =
  | { kind: "loading" }
  | { kind: "file"; text: string }
  | { kind: "missing" }
  | { kind: "error"; message: string };

/**
 * The look of the parts of the JSON text. Keys are purple. Numbers and literals are bold. Each
 * color has a contrast of at least 4.5:1 on `--muted`, in light and dark mode.
 */
const TOKEN_CLASSES: Record<JsonTokenKind, string> = {
  key: "text-chart-7",
  string: "text-foreground",
  number: "font-semibold text-foreground",
  literal: "font-semibold text-foreground",
  punctuation: "text-muted-foreground",
  space: "",
};

/**
 * Above this length, the view shows the text without colors. Thousands of colored parts would make
 * the dialog slow to open, for example for the price history of `kursverlauf`.
 */
export const MAX_COLORED_LENGTH = 100_000;

export type RawDataDialogProps = {
  /** `null` closes the dialog. */
  file: RawFile | null;
  fileName: string;
  folderName: string;
  /** `true` if the app has changes that are not in the file yet. */
  unsaved: boolean;
  onClose: () => void;
};

/**
 * Shows the data file as it is in the data folder: the JSON text with indents and colors. The
 * person can only read it. The dialog does not change the file.
 */
export function RawDataDialog({
  file,
  fileName,
  folderName,
  unsaved,
  onClose,
}: RawDataDialogProps) {
  return (
    // The dialog has no trigger. Thus it calls onOpenChange only to close.
    <Dialog open={file !== null} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{fileName}</DialogTitle>
          <DialogDescription>
            Die Rohdaten aus dem Ordner „{folderName}“. Hier kannst du sie nur ansehen, nicht
            ändern.
          </DialogDescription>
        </DialogHeader>
        {unsaved && (
          <p className="text-sm text-muted-foreground">
            Deine letzten Änderungen sind noch nicht gespeichert. Sie fehlen hier noch.
          </p>
        )}
        {file && <RawContent file={file} />}
      </DialogContent>
    </Dialog>
  );
}

function RawContent({ file }: { file: RawFile }) {
  switch (file.kind) {
    case "loading":
      return <p className="text-sm text-muted-foreground">Lädt …</p>;
    case "missing":
      return (
        <p className="text-sm text-muted-foreground">
          Die Datei gibt es noch nicht. Die App schreibt sie bei der ersten Änderung.
        </p>
      );
    case "error":
      return (
        <p className="text-sm text-destructive">Die Datei lässt sich nicht lesen: {file.message}</p>
      );
    case "file":
      return <FileText text={file.text} />;
  }
}

/** The JSON text with an indent of 2 spaces, or `null` if the text is not valid JSON. */
function prettyJson(text: string): string | null {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return null;
  }
}

function FileText({ text }: { text: string }) {
  const pretty = prettyJson(text);
  return (
    <>
      {pretty === null && (
        <p className="text-sm text-muted-foreground">
          Die Datei ist kein gültiges JSON. Hier steht ihr Text, wie er in der Datei steht.
        </p>
      )}
      <section aria-label="Inhalt der Datei">
        <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
          {pretty !== null && pretty.length <= MAX_COLORED_LENGTH
            ? jsonTokens(pretty).map((token) => (
                <span key={token.start} className={TOKEN_CLASSES[token.kind]}>
                  {token.text}
                </span>
              ))
            : (pretty ?? text)}
        </pre>
      </section>
    </>
  );
}
