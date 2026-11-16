import { Badge } from "@pocket-apps/ui/components/badge";
import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { Plus, Trash2 } from "lucide-react";
import type { ComponentProps } from "react";
import { addEntryId } from "./dom-ids.ts";
import { DragHandle } from "./drag-handle.tsx";
import type { Section } from "./schema.ts";
import { SECTION_KIND_INFO } from "./section-kinds.ts";
import { SectionTitle } from "./section-title.tsx";
import { entrySummaries } from "./summaries.ts";
import { useDragSort } from "./use-drag-sort.ts";
import type { Direction, DropPosition } from "./variants.ts";

export type SectionCardProps = {
  section: Section;
  /** The props of the drag handle of the section, from the list of sections. */
  handleProps: Omit<ComponentProps<typeof DragHandle>, "name">;
  /** Gets the new title. */
  onRename: (title: string) => void;
  onRemove: () => void;
  onAddEntry: () => void;
  onEditEntry: (entryId: string) => void;
  onStepEntry: (entryId: string, direction: Direction) => void;
  onDropEntry: (draggedId: string, targetId: string, position: DropPosition) => void;
  onRemoveEntry: (entryId: string) => void;
  /** The entry that the editor and the preview highlight, or `null`. */
  highlightedEntryId: string | null;
  /** The mouse or the keyboard focus is on an entry (its ID), or it left the entry (`null`). */
  onHoverEntry: (entryId: string | null) => void;
};

/** One section in the editor: its title, its actions and the list of its entries. */
export function SectionCard(props: SectionCardProps) {
  const { section } = props;
  const entries = entrySummaries(section);
  const name = `„${section.title}“`;
  const sort = useDragSort({ onDrop: props.onDropEntry, onStep: props.onStepEntry });
  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <DragHandle name={`Abschnitt ${name}`} {...props.handleProps} />
          <SectionTitle title={section.title} onRename={props.onRename} />
          <Badge variant="secondary">{SECTION_KIND_INFO[section.kind].label}</Badge>
          <span className="text-xs font-normal text-muted-foreground">
            {entries.length === 1 ? "1 Eintrag" : `${String(entries.length)} Einträge`}
          </span>
        </CardTitle>
        <CardAction className="flex">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Abschnitt ${name} löschen`}
            onClick={props.onRemove}
          >
            <Trash2 />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {/* The entries are in their own panel, indented under the title of the section. */}
        <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-1.5 sm:ml-10">
          {entries.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Noch keine Einträge.</p>
          ) : (
            <ul
              className="flex flex-col gap-0.5"
              aria-label={`Einträge von ${name}`}
              {...sort.listProps()}
            >
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  {...sort.rowProps(entry.id)}
                  className={
                    props.highlightedEntryId === entry.id
                      ? `${sort.rowClass(entry.id)} flex items-center gap-0.5 rounded-lg bg-background ring-1 ring-primary/40`
                      : `${sort.rowClass(entry.id)} flex items-center gap-0.5 rounded-lg`
                  }
                  data-highlighted={props.highlightedEntryId === entry.id || undefined}
                  onMouseEnter={() => {
                    props.onHoverEntry(entry.id);
                  }}
                  onMouseLeave={() => {
                    props.onHoverEntry(null);
                  }}
                  onFocus={() => {
                    props.onHoverEntry(entry.id);
                  }}
                  onBlur={() => {
                    props.onHoverEntry(null);
                  }}
                >
                  <DragHandle small name={`„${entry.title}“`} {...sort.handleProps(entry.id)} />
                  <Button
                    variant="ghost"
                    className="h-auto min-w-0 flex-1 flex-col items-start gap-0 rounded-md px-2 py-1.5 text-left hover:bg-transparent"
                    onClick={() => {
                      props.onEditEntry(entry.id);
                    }}
                  >
                    <span className="block w-full truncate text-sm font-medium">{entry.title}</span>
                    {entry.detail !== "" && (
                      <span className="block w-full truncate text-xs font-normal text-muted-foreground">
                        {entry.detail}
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`„${entry.title}“ löschen`}
                    onClick={() => {
                      props.onRemoveEntry(entry.id);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button
            id={addEntryId(section.id)}
            variant="ghost"
            size="sm"
            className="justify-start rounded-lg border border-dashed border-foreground/20 text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={props.onAddEntry}
          >
            <Plus data-icon="inline-start" />
            Eintrag hinzufügen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
