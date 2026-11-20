import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { Label } from "@pocket-apps/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@pocket-apps/ui/components/native-select";
import { isOneOf } from "@pocket-apps/core/one-of";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PurchaseDialog, type DialogState } from "./purchase-dialog.tsx";
import { PurchaseRow } from "./purchase-row.tsx";
import {
  addPurchase,
  changePurchase,
  formatEuro,
  newId,
  removePurchase,
  SORT_LABELS,
  SORTS,
  sortPurchases,
  totalCents,
  type Sort,
} from "./purchases.ts";
import { useDataFile } from "./schema.ts";

/** Today as an ISO day in the time zone of the device. */
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${String(now.getFullYear())}-${month}-${day}`;
}

/** The purchases with their sum, the order and the dialog. Use it only inside `DataFileProvider`. */
export function PurchaseListView() {
  const { data, update } = useDataFile();
  const [sort, setSort] = useState<Sort>("date-desc");
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const purchases = sortPurchases(data.purchases, sort);
  const count = data.purchases.length;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Deine Käufe</h2>
          </CardTitle>
          <CardDescription>
            {count === 1 ? "1 Spiel" : `${String(count)} Spiele`} ·{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatEuro(totalCents(data.purchases))}
            </span>
          </CardDescription>
          <CardAction>
            <Button
              size="sm"
              onClick={() => {
                setDialog({ kind: "new" });
              }}
            >
              <Plus data-icon="inline-start" />
              Kauf
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {count === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Käufe. Füge deinen ersten Kauf mit „Kauf“ hinzu.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Label htmlFor="purchase-sort">Sortieren nach</Label>
                <NativeSelect
                  id="purchase-sort"
                  value={sort}
                  onChange={(event) => {
                    if (isOneOf(SORTS, event.target.value)) setSort(event.target.value);
                  }}
                >
                  {SORTS.map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {SORT_LABELS[value]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <ul aria-label="Käufe" className="flex flex-col divide-y">
                {purchases.map((purchase) => (
                  <PurchaseRow
                    key={purchase.id}
                    purchase={purchase}
                    onEdit={() => {
                      setDialog({ kind: "edit", purchase });
                    }}
                    onRemove={() => {
                      if (!window.confirm(`Kauf „${purchase.name}“ löschen?`)) return;
                      update((list) => removePurchase(list, purchase.id));
                    }}
                  />
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
      <PurchaseDialog
        state={dialog}
        today={todayIso()}
        onSave={(input) => {
          if (dialog.kind === "edit") {
            const id = dialog.purchase.id;
            update((list) => changePurchase(list, id, input));
          } else {
            update((list) => addPurchase(list, input, newId()));
          }
          setDialog({ kind: "closed" });
        }}
        onClose={() => {
          setDialog({ kind: "closed" });
        }}
      />
    </main>
  );
}
