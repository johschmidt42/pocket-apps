import { Button } from "@pocket-apps/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { useState, type ReactNode } from "react";
import { GamePicture } from "./game-picture.tsx";
import { parseAppId, parsePrice, type PurchaseInput } from "./purchases.ts";
import type { Purchase } from "./schema.ts";

/** What the dialog does. */
export type DialogState =
  { kind: "closed" } | { kind: "new" } | { kind: "edit"; purchase: Purchase };

export type PurchaseDialogProps = {
  state: DialogState;
  /** The day for a new purchase, for example today. */
  today: string;
  onSave: (input: PurchaseInput) => void;
  onClose: () => void;
};

/** Adds or changes a purchase. */
export function PurchaseDialog({ state, today, onSave, onClose }: PurchaseDialogProps) {
  return (
    <Dialog
      open={state.kind !== "closed"}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {state.kind !== "closed" && (
          <PurchaseForm
            key={state.kind === "edit" ? state.purchase.id : "new"}
            purchase={state.kind === "edit" ? state.purchase : null}
            today={today}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PurchaseForm({
  purchase,
  today,
  onSave,
}: {
  purchase: Purchase | null;
  today: string;
  onSave: (input: PurchaseInput) => void;
}) {
  const [name, setName] = useState(purchase?.name ?? "");
  const [date, setDate] = useState(purchase?.date ?? today);
  const [price, setPrice] = useState(
    purchase ? (purchase.priceCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [steam, setSteam] = useState(purchase?.appId === null ? "" : String(purchase?.appId ?? ""));
  const [showErrors, setShowErrors] = useState(false);

  const priceCents = parsePrice(price);
  const appId = parseAppId(steam);
  const errors = {
    name: name.trim() === "" ? "Gib den Namen des Spiels ein." : null,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? null : "Gib das Datum des Kaufs ein.",
    price: priceCents === null ? "Gib den Preis in Euro ein, zum Beispiel 14,99." : null,
    steam:
      appId === undefined
        ? "Gib einen Link aus dem Steam-Shop oder eine AppID ein, oder lass das Feld leer."
        : null,
  };
  const shown = (error: string | null) => (showErrors ? error : null);

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (priceCents === null || appId === undefined || Object.values(errors).some(Boolean)) {
          setShowErrors(true);
          return;
        }
        onSave({ name: name.trim(), date, priceCents, appId });
      }}
    >
      <DialogHeader>
        <DialogTitle>{purchase ? "Kauf bearbeiten" : "Neuer Kauf"}</DialogTitle>
        <DialogDescription>Das Bild kommt von Steam, wenn du den Link angibst.</DialogDescription>
      </DialogHeader>
      <Field id="purchase-name" label="Spiel" error={shown(errors.name)}>
        <Input
          id="purchase-name"
          value={name}
          placeholder="z. B. Hades"
          aria-invalid={shown(errors.name) !== null}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="purchase-date" label="Datum" error={shown(errors.date)}>
          <Input
            id="purchase-date"
            type="date"
            value={date}
            aria-invalid={shown(errors.date) !== null}
            onChange={(event) => {
              setDate(event.target.value);
            }}
          />
        </Field>
        <Field id="purchase-price" label="Preis in Euro" error={shown(errors.price)}>
          <Input
            id="purchase-price"
            inputMode="decimal"
            value={price}
            placeholder="z. B. 14,99"
            aria-invalid={shown(errors.price) !== null}
            onChange={(event) => {
              setPrice(event.target.value);
            }}
          />
        </Field>
      </div>
      <Field
        id="purchase-steam"
        label="Steam-Link oder AppID (optional)"
        error={shown(errors.steam)}
      >
        <Input
          id="purchase-steam"
          value={steam}
          placeholder="https://store.steampowered.com/app/…"
          aria-invalid={shown(errors.steam) !== null}
          onChange={(event) => {
            setSteam(event.target.value);
          }}
        />
      </Field>
      {appId !== undefined && appId !== null && <GamePicture appId={appId} />}
      <DialogFooter>
        <Button type="submit">Speichern</Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error: string | null;
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
