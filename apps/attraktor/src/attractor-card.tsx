import { Button } from "@pocket-apps/ui/components/button";
import { Card, CardContent } from "@pocket-apps/ui/components/card";
import type { Attractor } from "./attractors.ts";
import { PREVIEW_VIEW_BOX, previewPath } from "./preview.ts";

/** A gallery card. The button covers the whole card, so a click anywhere opens the attractor. */
export function AttractorCard({
  attractor,
  onSelect,
}: {
  attractor: Attractor;
  onSelect: (attractor: Attractor) => void;
}) {
  return (
    <Card className="relative h-full pt-0 transition-colors hover:bg-muted/50 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
      <svg
        viewBox={PREVIEW_VIEW_BOX}
        aria-hidden="true"
        className="aspect-[4/3] w-full bg-muted text-foreground"
      >
        <path
          d={previewPath(attractor)}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.7}
          strokeWidth={0.01}
        />
      </svg>
      <CardContent className="flex flex-col gap-1">
        <h3 className="font-heading text-base font-medium">
          {/* The ::after of the button covers the whole card. On a press, Button sets a CSS translate.
              Any translate makes the button hold its ::after. Then the release lands on the
              picture, and the browser sends no click. Thus "translate-none". */}
          <Button
            variant="link"
            className="h-auto p-0 text-base text-foreground after:absolute after:inset-0 focus-visible:ring-0 active:not-aria-[haspopup]:translate-none"
            onClick={() => {
              onSelect(attractor);
            }}
          >
            {attractor.name}
          </Button>
        </h3>
        <p className="text-muted-foreground">{attractor.description}</p>
      </CardContent>
    </Card>
  );
}
