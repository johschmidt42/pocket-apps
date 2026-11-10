import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { Label } from "@pocket-apps/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@pocket-apps/ui/components/native-select";
import { useState } from "react";
import type { Selection } from "./schema.ts";
import { schoolYearLabel, startYearOf, yearChoices } from "./school-years.ts";
import { isStateCode, STATES, type StateCode } from "./states.ts";

/** The first screen: the user picks the state and the school year. */
export function SetupCard({
  today,
  loading,
  onSubmit,
}: {
  today: string;
  loading: boolean;
  onSubmit: (selection: Selection) => void;
}) {
  const [state, setState] = useState<StateCode | "">("");
  const [startYear, setStartYear] = useState(() => startYearOf(today));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Schuljahr wählen</h2>
        </CardTitle>
        <CardDescription>
          Die App lädt die Ferien und Feiertage einmal aus dem Internet. Sie speichert sie in deinem
          Datenordner. Danach braucht sie dafür kein Internet mehr.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (state !== "") onSubmit({ state, startYear });
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="setup-state">Bundesland</Label>
            <NativeSelect
              id="setup-state"
              className="w-full"
              value={state}
              onChange={(event) => {
                if (isStateCode(event.target.value)) setState(event.target.value);
              }}
            >
              <NativeSelectOption value="" disabled>
                Bitte wählen
              </NativeSelectOption>
              {STATES.map(({ code, name }) => (
                <NativeSelectOption key={code} value={code}>
                  {name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="setup-year">Schuljahr</Label>
            <NativeSelect
              id="setup-year"
              className="w-full"
              value={String(startYear)}
              onChange={(event) => {
                setStartYear(Number(event.target.value));
              }}
            >
              {yearChoices(today, []).map((year) => (
                <NativeSelectOption key={year} value={String(year)}>
                  {schoolYearLabel(year)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" disabled={state === "" || loading}>
            Ferien laden
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
