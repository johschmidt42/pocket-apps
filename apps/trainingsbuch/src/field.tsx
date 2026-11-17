import { Label } from "@pocket-apps/ui/components/label";
import type { ReactNode } from "react";

/** A label, an input and an error message below it. */
export function Field({
  id,
  label,
  error = null,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
