import { Button } from "@pocket-apps/ui/components/button";
import { Eye, EyeOff, MessageSquareText } from "lucide-react";
import type { BubblePlace } from "./bubble-place.ts";
import { durationText, formatWhen } from "./dates.ts";
import { GEOMETRY, type Columns, type Mark } from "./layout.ts";
import { HintTooltip } from "./hint-tooltip.tsx";
import { LeafTooltip } from "./leaf-tooltip.tsx";
import type { Entry } from "./schema.ts";
import { hasDescription } from "./timelines.ts";
import { CARD_ATTRIBUTE, OUTWARD_ATTRIBUTE } from "./use-active-card.ts";

/**
 * `edit`: a click on a card opens the entry, and the eye button on a card hides or shows the
 * entry. `example`: the cards only show the entries, with their descriptions.
 */
export type ChartActions =
  | {
      kind: "edit";
      onEdit: (entry: Entry) => void;
      /** Hides a visible entry or shows a hidden entry. */
      onToggle: (entry: Entry) => void;
    }
  | { kind: "example" };

/**
 * The look of a card. The name tells the side of the card in the picture and its color.
 * - `leaf`: a leaf shape. Two corners are round, two are small. The left side is the mirror.
 * - `color`: a light tint of the side color on the full card, and a border in the side color.
 *   The border gets stronger while the card is active.
 * A card on the left always has `--chart-1`. Only in one column, a card on the right can have
 * `--chart-1`.
 */
const LOOKS = {
  rightChart1: {
    leaf: "rounded-[1.25rem_0.375rem]",
    color: "border-chart-1/30 bg-chart-1/8 group-hover/card:border-chart-1/60",
  },
  rightChart2: {
    leaf: "rounded-[1.25rem_0.375rem]",
    color: "border-chart-2/30 bg-chart-2/8 group-hover/card:border-chart-2/60",
  },
  leftChart1: {
    leaf: "rounded-[0.375rem_1.25rem]",
    color: "border-chart-1/30 bg-chart-1/8 group-hover/card:border-chart-1/60",
  },
};

/**
 * The card box: its left edge, its width, the padding to the trunk (`labelEdge`) and its look. The
 * box reaches to the middle of the trunk. Thus the `foreignObject` of the box lets pointer events
 * through, and only the card in it takes them. Else the box would cover the trunk, and a click on
 * the trunk would not work.
 */
function cardBox(mark: Mark, columns: Columns) {
  if (columns === "one") {
    // 36 px (the trunk) + 64 px (labelEdge) = 100 px = pl-25.
    return {
      x: 0,
      width: "100%",
      box: "flex h-full items-center justify-start pl-25",
      look: mark.colorSide === "left" ? LOOKS.rightChart1 : LOOKS.rightChart2,
    };
  }
  return mark.side === "left"
    ? {
        x: 0,
        width: "50%",
        box: "flex h-full items-center justify-end pr-16",
        look: LOOKS.leftChart1,
      }
    : {
        x: "50%",
        width: "50%",
        box: "flex h-full items-center justify-start pl-16",
        look: LOOKS.rightChart2,
      };
}

export type MarkCardProps = {
  mark: Mark;
  columns: Columns;
  today: number;
  dimmed: boolean;
  /** `true` shows the description bubble. */
  showBubble: boolean;
  bubble: BubblePlace;
  /** Closes the bubble of this card, for example on Escape or before the dialog opens. */
  onCloseBubble: () => void;
  actions: ChartActions;
};

/**
 * The card ("leaf") of an entry: a button with the title and one line with the time and the
 * length. A small icon after the title tells that the entry has a description. The pseudo element
 * `after` stretches the button over the full card. Thus a click anywhere on the card opens the
 * entry. The eye button in the corner hides the entry. With a mouse, it shows only while the mouse
 * is on the card or the keyboard focus is in it: the user needs it rarely. On a touch screen, it
 * always shows. An example card has no buttons. A hidden entry has a faded card with a dashed
 * border, and its eye button always shows: there, showing the entry again is the main action. The
 * timeline finds the card under the mouse by its attribute `data-entry-id` (see `useActiveCard`).
 */
export function MarkCard({
  mark,
  columns,
  today,
  dimmed,
  showBubble,
  bubble,
  onCloseBubble,
  actions,
}: MarkCardProps) {
  const { entry } = mark;
  const hidden = !entry.visible;
  const duration = durationText(entry.when, today);
  const box = cardBox(mark, columns);
  // The card gives the white base and the shadow. The button on it gives the border and the tint.
  const look = hidden
    ? "bg-card/40 text-muted-foreground"
    : // No movement on hover: a card that moves away from a resting mouse loses the hover.
      "bg-card shadow-xs group-hover/card:shadow-md";
  const fade = dimmed ? "opacity-50" : hidden ? "opacity-80" : "";
  const mainClass = `flex h-full w-full min-w-0 flex-col justify-center gap-0.5 border px-4 text-left transition-colors ${box.look.leaf} ${hidden ? "border-dashed border-border" : box.look.color}`;
  const content = (
    <>
      <span className="flex max-w-full min-w-0 items-center gap-1.5 pr-5">
        <span className="truncate text-sm font-semibold">{entry.title}</span>
        {hasDescription(entry) && (
          <>
            <MessageSquareText
              aria-hidden="true"
              className="size-3 shrink-0 text-muted-foreground/70"
            />
            <span className="sr-only">(mit Beschreibung)</span>
          </>
        )}
        {hidden && <span className="sr-only">(ausgeblendet)</span>}
      </span>
      <span className="truncate text-xs text-muted-foreground tabular-nums">
        {formatWhen(entry.when)}
        {duration && ` · ${duration}`}
      </span>
    </>
  );
  const main =
    actions.kind === "edit" ? (
      <button
        type="button"
        className={`cursor-pointer outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50 ${mainClass}`}
        onClick={() => {
          onCloseBubble();
          actions.onEdit(entry);
        }}
      >
        {content}
      </button>
    ) : (
      <div className={mainClass}>{content}</div>
    );
  return (
    <foreignObject
      x={box.x}
      y={mark.labelTop}
      width={box.width}
      height={GEOMETRY.labelHeight}
      className="pointer-events-none overflow-visible"
    >
      <div className={box.box}>
        <div
          {...{ [CARD_ATTRIBUTE]: entry.id, [OUTWARD_ATTRIBUTE]: mark.side }}
          className={`group/card pointer-events-auto relative flex h-full w-full max-w-72 min-w-0 items-center transition-all ${box.look.leaf} ${look} ${fade}`}
        >
          {hasDescription(entry) ? (
            <LeafTooltip
              open={showBubble}
              place={bubble}
              onEscape={onCloseBubble}
              text={entry.description}
              colorSide={mark.colorSide}
            >
              {main}
            </LeafTooltip>
          ) : (
            main
          )}
          {actions.kind === "edit" && (
            // Below the button: above it, the hint would cover the description bubble.
            <HintTooltip hint={hidden ? "Einblenden" : "Ausblenden"} side="bottom">
              <Button
                variant="ghost"
                size="icon-xs"
                className={
                  hidden
                    ? "absolute top-1.5 right-2 cursor-pointer text-muted-foreground"
                    : "absolute top-1.5 right-2 cursor-pointer text-muted-foreground transition-opacity group-focus-within/card:opacity-100 group-hover/card:opacity-100 pointer-fine:opacity-0"
                }
                aria-label={hidden ? `„${entry.title}“ einblenden` : `„${entry.title}“ ausblenden`}
                onClick={() => {
                  actions.onToggle(entry);
                }}
              >
                {hidden ? <Eye /> : <EyeOff />}
              </Button>
            </HintTooltip>
          )}
        </div>
      </div>
    </foreignObject>
  );
}
