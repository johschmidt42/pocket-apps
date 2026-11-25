import { parseNumber } from "@pocket-apps/core/numbers";
import { Button } from "@pocket-apps/ui/components/button";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

/**
 * One setting as a row: the label at the left, then "−", the number and "+". The user can also
 * type the number, but only digits. With `optional`, "−" below `min` empties the input (for
 * example "no time cap"). `unitSwitch` shows below the row, for example a choice of the unit.
 */
export function NumberStepper({
  id,
  label,
  unit,
  unitName,
  value,
  step,
  min,
  max,
  optional = false,
  error,
  unitSwitch = null,
  onChange,
}: {
  id: string;
  label: string;
  /** The short unit after the number, for example "min". Empty: no unit. */
  unit: string;
  /** The unit for screen readers, for example "in Minuten". */
  unitName: string;
  value: string;
  step: number;
  min: number;
  max: number;
  optional?: boolean;
  error: string | null;
  unitSwitch?: ReactNode;
  onChange: (value: string) => void;
}) {
  const current = parseNumber(value);

  const decrease = () => {
    if (current === null) return;
    const next = current - step;
    if (next < min) onChange(optional ? "" : String(min));
    else onChange(String(Math.min(next, max)));
  };
  const increase = () => {
    if (current === null) onChange(String(min));
    else onChange(String(Math.max(min, Math.min(current + step, max))));
  };

  return (
    <div className="flex flex-col gap-1 py-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="min-w-0 text-base">
          {label}
          {unitName !== "" && <span className="sr-only"> {unitName}</span>}
        </Label>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="rounded-full"
            aria-label={`${label} verringern`}
            disabled={current === null || (!optional && current <= min)}
            onClick={decrease}
          >
            <Minus aria-hidden="true" />
          </Button>
          <div className="flex w-20 items-baseline justify-center gap-1">
            <Input
              id={id}
              inputMode="numeric"
              maxLength={4}
              value={value}
              placeholder={optional ? "–" : undefined}
              aria-invalid={error !== null}
              className="h-10 w-12 border-0 bg-transparent px-0 text-center text-xl font-semibold tabular-nums shadow-none dark:bg-transparent"
              onChange={(event) => {
                // Only digits: letters and other characters do not appear.
                onChange(event.target.value.replace(/\D/g, ""));
              }}
            />
            {unit !== "" && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="rounded-full"
            aria-label={`${label} erhöhen`}
            disabled={current !== null && current >= max}
            onClick={increase}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </div>
      {unitSwitch}
      {error !== null && <p className="text-right text-sm text-destructive">{error}</p>}
    </div>
  );
}
