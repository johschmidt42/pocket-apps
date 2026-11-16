import { Button } from "@pocket-apps/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { Plus } from "lucide-react";
import type { Timeline } from "./schema.ts";

export type TimelineBarProps = {
  timelines: readonly Timeline[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
};

/** One pill per timeline. A click on a pill shows its timeline. */
export function TimelineBar({ timelines, activeId, onSelect, onNew }: TimelineBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={2}
        aria-label="Zeitstrahl"
        className="flex-wrap"
        value={activeId}
        onValueChange={(id) => {
          // A click on the active pill gives an empty value. The timeline stays.
          if (id !== "") onSelect(id);
        }}
      >
        {timelines.map((timeline) => (
          <ToggleGroupItem
            key={timeline.id}
            value={timeline.id}
            className="bg-card data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground"
          >
            {timeline.name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Button variant="ghost" onClick={onNew}>
        <Plus data-icon="inline-start" />
        Neuer Zeitstrahl
      </Button>
    </div>
  );
}
