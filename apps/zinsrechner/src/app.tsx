import { AppHeader } from "@pocket-apps/core/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@pocket-apps/ui/components/card";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { useState } from "react";
import { compoundInterest, parseInterestInput } from "./interest.ts";

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function App() {
  const [principal, setPrincipal] = useState("10000");
  const [ratePercent, setRatePercent] = useState("3");
  const [years, setYears] = useState("10");

  const input = parseInterestInput({ principal, ratePercent, years });
  const result = input ? compoundInterest(input) : null;

  return (
    <>
      <AppHeader app={__POCKET_APP__} />
      <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="principal">Startkapital (€)</Label>
              <Input
                id="principal"
                inputMode="decimal"
                value={principal}
                onChange={(event) => {
                  setPrincipal(event.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rate">Zinssatz pro Jahr (%)</Label>
              <Input
                id="rate"
                inputMode="decimal"
                value={ratePercent}
                onChange={(event) => {
                  setRatePercent(event.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="years">Laufzeit (Jahre)</Label>
              <Input
                id="years"
                inputMode="numeric"
                value={years}
                onChange={(event) => {
                  setYears(event.target.value);
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ergebnis</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Endkapital</dt>
                <dd className="text-right font-medium">{euro.format(result.finalAmount)}</dd>
                <dt className="text-muted-foreground">Zinsen</dt>
                <dd className="text-right font-medium">{euro.format(result.interest)}</dd>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Bitte gib gültige Zahlen ein.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
