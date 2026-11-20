import { Button } from "@pocket-apps/ui/components/button";
import type { StorageKind } from "./folder.ts";
import { STORAGE_TEXTS } from "./storage-kinds.ts";

export type StorageChoiceProps = {
  /** The kinds of storage that this browser can use. Only these show. */
  kinds: readonly StorageKind[];
  onPick: (kind: StorageKind) => void;
};

/** The places where the data can live, each with a short text and a button. */
export function StorageChoice({ kinds, onPick }: StorageChoiceProps) {
  return (
    <ul className="flex flex-col gap-3">
      {kinds.map((kind) => {
        const option = STORAGE_TEXTS[kind];
        const Icon = option.icon;
        const ButtonIcon = option.buttonIcon;
        return (
          <li key={kind} className="flex flex-col gap-2 rounded-lg border p-3">
            <h3 className="flex items-center gap-2 font-medium text-foreground">
              <Icon aria-hidden="true" className="size-4" />
              {option.title}
            </h3>
            {option.texts.map((text) => (
              <p key={text} className="text-sm text-muted-foreground">
                {text}
              </p>
            ))}
            <div>
              <Button
                variant={kind === kinds[0] ? "default" : "outline"}
                onClick={() => {
                  onPick(kind);
                }}
              >
                <ButtonIcon data-icon="inline-start" />
                {option.button}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
