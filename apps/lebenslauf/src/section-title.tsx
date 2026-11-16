import { Button } from "@pocket-apps/ui/components/button";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

export type SectionTitleProps = {
  title: string;
  /** Gets the new title without spaces at the start and the end. Never empty. */
  onRename: (title: string) => void;
};

/**
 * The title of a section in the editor. A click on it shows a text field. Enter or a click
 * outside saves the new title, Escape keeps the old one. An empty title keeps the old one.
 */
export function SectionTitle({ title, onRename }: SectionTitleProps) {
  const inputId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Enter and Escape end the edit. The text field then goes away, and Chrome can send a blur.
  // This mark makes sure that only the first of these events counts.
  const isEditing = useRef(false);

  function startEdit() {
    isEditing.current = true;
    flushSync(() => {
      setDraft(title);
    });
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  /** Ends the edit. `save`: keep the new title (if it is not empty). */
  function endEdit(save: boolean, moveFocus: boolean) {
    if (!isEditing.current) return;
    isEditing.current = false;
    const name = draft?.trim() ?? "";
    if (save && name !== "" && name !== title) onRename(name);
    flushSync(() => {
      setDraft(null);
    });
    if (moveFocus) buttonRef.current?.focus();
  }

  if (draft === null) {
    return (
      <h3 className="min-w-0">
        <Button
          ref={buttonRef}
          variant="ghost"
          className="h-auto max-w-full justify-start px-2 py-1 text-left text-lg font-semibold break-words whitespace-normal"
          title="Klicken zum Umbenennen"
          onClick={startEdit}
        >
          {title}
        </Button>
      </h3>
    );
  }

  return (
    <form
      className="min-w-0 flex-1"
      onSubmit={(event) => {
        event.preventDefault();
        endEdit(true, true);
      }}
    >
      <Label htmlFor={inputId} className="sr-only">
        Überschrift des Abschnitts
      </Label>
      <Input
        ref={inputRef}
        id={inputId}
        className="h-9 text-lg font-semibold"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          endEdit(false, true);
        }}
        onBlur={() => {
          endEdit(true, false);
        }}
      />
    </form>
  );
}
