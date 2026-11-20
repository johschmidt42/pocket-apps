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
import { Field } from "@pocket-apps/ui/field";
import { useState } from "react";
import { z } from "zod";
import { GamePicture } from "./game-picture.tsx";
import { parseAppId, parsePrice, priceText, type PurchaseInput } from "./purchases.ts";
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
  const [price, setPrice] = useState(purchase ? priceText(purchase.priceCents) : "");
  const [steamText, setSteamText] = useState(
    purchase?.appId === null || purchase === null ? "" : String(purchase.appId),
  );
  // The errors show only after the first try to save.
  const [triedSave, setTriedSave] = useState(false);

  const priceCents = parsePrice(price);
  const appId = parseAppId(steamText);
  const errors = {
    name: name.trim() === "" ? "Gib den Namen des Spiels ein." : null,
    date: z.iso.date().safeParse(date).success ? null : "Gib das Datum des Kaufs ein.",
    price: priceCents === null ? "Gib den Preis in Euro ein, zum Beispiel 14,99." : null,
    steam:
      appId.kind === "invalid"
        ? "Gib einen Link aus dem Steam-Shop oder eine AppID ein, oder lass das Feld leer."
        : null,
  };
  const visibleError = (error: string | null) => (triedSave ? error : null);

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTriedSave(true);
        if (errors.name !== null || errors.date !== null || priceCents === null) return;
        if (appId.kind === "invalid") return;
        onSave({
          name: name.trim(),
          date,
          priceCents,
          appId: appId.kind === "id" ? appId.id : null,
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>{purchase ? "Kauf bearbeiten" : "Neuer Kauf"}</DialogTitle>
        <DialogDescription>Das Bild kommt von Steam, wenn du den Link angibst.</DialogDescription>
      </DialogHeader>
      <Field id="purchase-name" label="Spiel" error={visibleError(errors.name)}>
        <Input
          id="purchase-name"
          value={name}
          placeholder="z. B. Hades"
          aria-invalid={visibleError(errors.name) !== null}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="purchase-date" label="Datum" error={visibleError(errors.date)}>
          <Input
            id="purchase-date"
            type="date"
            value={date}
            aria-invalid={visibleError(errors.date) !== null}
            onChange={(event) => {
              setDate(event.target.value);
            }}
          />
        </Field>
        <Field id="purchase-price" label="Preis in Euro" error={visibleError(errors.price)}>
          <Input
            id="purchase-price"
            inputMode="decimal"
            value={price}
            placeholder="z. B. 14,99"
            aria-invalid={visibleError(errors.price) !== null}
            onChange={(event) => {
              setPrice(event.target.value);
            }}
          />
        </Field>
      </div>
      <Field
        id="purchase-steam"
        label="Steam-Link oder AppID (optional)"
        error={visibleError(errors.steam)}
      >
        <Input
          id="purchase-steam"
          value={steamText}
          placeholder="https://store.steampowered.com/app/…"
          aria-invalid={visibleError(errors.steam) !== null}
          onChange={(event) => {
            setSteamText(event.target.value);
          }}
        />
      </Field>
      {appId.kind === "id" && <GamePicture appId={appId.id} />}
      <DialogFooter>
        <Button type="submit">Speichern</Button>
      </DialogFooter>
    </form>
  );
}
