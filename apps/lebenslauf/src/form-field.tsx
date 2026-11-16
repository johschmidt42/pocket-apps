import { Label } from "@pocket-apps/ui/components/label";
import type { ReactNode } from "react";
import { errorId } from "./dom-ids.ts";

export type FormFieldProps = {
  /** The ID of the input. */
  id: string;
  label: string;
  /** A short help text under the input. */
  hint?: string;
  /** An error text under the input. Give the input `aria-describedby={errorId(id)}` with it. */
  error?: string | null;
  children: ReactNode;
};

/** A label, an input and an optional help or error text. */
export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={errorId(id)} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
