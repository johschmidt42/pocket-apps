import { Button } from "@pocket-apps/ui/components/button";
import { Pencil, Trash2 } from "lucide-react";
import { GamePicture } from "./game-picture.tsx";
import { formatDate, formatEuro } from "./purchases.ts";
import type { Purchase } from "./schema.ts";

export type PurchaseRowProps = {
  purchase: Purchase;
  onEdit: () => void;
  onRemove: () => void;
};

/** One purchase: picture, name, day and price. On a phone, the buttons are in a second line. */
export function PurchaseRow({ purchase, onEdit, onRemove }: PurchaseRowProps) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <GamePicture appId={purchase.appId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 font-medium">{purchase.name}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDate(purchase.date)}
        </span>
      </div>
      <span className="shrink-0 font-medium tabular-nums">{formatEuro(purchase.priceCents)}</span>
      <div className="flex shrink-0 basis-full justify-end sm:basis-auto">
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`${purchase.name} bearbeiten`}
          onClick={onEdit}
        >
          <Pencil />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`${purchase.name} löschen`}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
