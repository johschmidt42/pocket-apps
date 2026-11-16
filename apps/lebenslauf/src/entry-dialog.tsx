import { Dialog, DialogContent } from "@pocket-apps/ui/components/dialog";
import { ListRowForm } from "./list-row-form.tsx";
import { ProjectForm } from "./project-form.tsx";
import { StationForm } from "./station-form.tsx";
import type { EntryOf, SavedEntry } from "./variants.ts";
import type { Section } from "./schema.ts";

/** What the dialog edits. `entry` is `null` for a new entry. */
export type EntryDraft = { sectionId: string } & {
  [K in Section["kind"]]: { kind: K; entry: EntryOf<K> | null };
}[Section["kind"]];

export type EntryDialogProps = {
  /** `null` closes the dialog. */
  draft: EntryDraft | null;
  onSave: (sectionId: string, saved: SavedEntry) => void;
  onClose: () => void;
};

/** The dialog to add or change an entry. The kind of the section sets the fields. */
export function EntryDialog({ draft, onSave, onClose }: EntryDialogProps) {
  return (
    // The dialog has no trigger. Thus it calls onOpenChange only to close.
    <Dialog open={draft !== null} onOpenChange={onClose}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        {draft && (
          <EntryForm
            draft={draft}
            onSave={(saved) => {
              onSave(draft.sectionId, saved);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({ draft, onSave }: { draft: EntryDraft; onSave: (saved: SavedEntry) => void }) {
  switch (draft.kind) {
    case "projects":
      return (
        <ProjectForm
          project={draft.entry}
          onSave={(entry) => {
            onSave({ kind: "projects", entry });
          }}
        />
      );
    case "stations":
      return (
        <StationForm
          station={draft.entry}
          onSave={(entry) => {
            onSave({ kind: "stations", entry });
          }}
        />
      );
    case "list":
      return (
        <ListRowForm
          row={draft.entry}
          onSave={(entry) => {
            onSave({ kind: "list", entry });
          }}
        />
      );
  }
}
