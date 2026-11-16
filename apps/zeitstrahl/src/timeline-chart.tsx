import { useWidth } from "@pocket-apps/core/use-width";
import { useId, useRef, useState } from "react";
import {
  dateChips,
  GEOMETRY,
  layoutTimeline,
  type Columns,
  type Layout,
  type Mark,
} from "./layout.ts";
import { MarkCard, type ChartActions } from "./mark-card.tsx";
import type { Entry, Scale, TrunkColor } from "./schema.ts";
import { SIDE_COLORS } from "./side-colors.ts";
import { BRANCH_ATTRIBUTE, DEFAULT_PLACE, useActiveCard } from "./use-active-card.ts";

/**
 * The colors of the trunk. They are the chart colors that no side uses. Gray is lighter than the
 * other colors, because gray is the default and must stay calm.
 */
const TRUNKS: Record<TrunkColor, { color: string; opacity: number; label: string }> = {
  gray: { color: "var(--muted-foreground)", opacity: 0.3, label: "Grau" },
  green: { color: "var(--chart-3)", opacity: 0.55, label: "Grün" },
  purple: { color: "var(--chart-7)", opacity: 0.55, label: "Lila" },
  pink: { color: "var(--chart-5)", opacity: 0.55, label: "Rosa" },
  yellow: { color: "var(--chart-4)", opacity: 0.55, label: "Gelb" },
  red: { color: "var(--chart-8)", opacity: 0.55, label: "Rot" },
};

const POINT_RADIUS = 6;
const CHIP_HEIGHT = 18;
/** The branch of a point is 10 px thick at the trunk. Each branch is 3 px thick at the card. */
const POINT_BRANCH = 10;
const BRANCH_END = 3;

/** Below this width, the timeline has one column: the line on the left, all cards right of it. */
const ONE_COLUMN_BELOW = 600;
/** In one column: the distance of the line from the left edge. The year chips need this space. */
const ONE_COLUMN_AXIS = 36;

export type TimelineChartProps = {
  entries: readonly Entry[];
  scale: Scale;
  /** Today as a day number. */
  today: number;
  /** `true` also shows the hidden entries, as faded cards with dashed lines. */
  showHidden: boolean;
  actions: ChartActions;
  trunk: TrunkColor;
  /** A click on the trunk gives it the next color. */
  onTrunkClick: () => void;
};

/**
 * The vertical timeline. Time goes from top to bottom. A thick trunk in the middle has a chip for
 * each year (or month). For each entry, a branch grows from the trunk to the card of the entry.
 * The branch of a range touches the trunk from the start to the end of the range. Thus a long
 * range has a wide branch. The branch of a point is narrow and has a ring on the trunk. Each
 * branch is thin at the card. A click on the trunk changes its color. A card shows the title and
 * the time of its entry. A card with a description has an icon, and the mouse on the card (or the
 * keyboard focus in it) shows the description. While the mouse is on a card, the other entries
 * fade.
 */
export function TimelineChart({
  entries,
  scale,
  today,
  showHidden,
  actions,
  trunk,
  onTrunkClick,
}: TimelineChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const columns: Columns = width > 0 && width < ONE_COLUMN_BELOW ? "one" : "two";
  const layout = layoutTimeline(entries, scale, today, columns, showHidden);
  const card = useActiveCard();
  // The height of the mouse on the trunk, or null. There, a chip tells that a click changes the
  // color. A tooltip of Radix would show at the middle of the long trunk, far from the mouse.
  const [trunkHover, setTrunkHover] = useState<number | null>(null);
  // A card that the user just hid is still the active card. Only a card on the timeline counts.
  const hasActive = layout.marks.some((mark) => mark.entry.id === card.active.id);
  const isActive = (mark: Mark) => card.active.id === mark.entry.id;
  const isDimmed = (mark: Mark) => hasActive && !isActive(mark);
  // The dates of the active entry on the trunk. They replace the tick chips near them.
  const activeMark = layout.marks.find(isActive);
  const dates = activeMark ? dateChips(activeMark) : [];
  const ticks = layout.ticks.filter((tick) =>
    dates.every((date) => Math.abs(date.y - tick.y) >= GEOMETRY.dateClearance),
  );
  return (
    <div
      ref={ref}
      className="rounded-2xl bg-muted/60 px-2 py-2 sm:px-4"
      onFocus={(event) => {
        card.track(event.target);
      }}
      onBlur={card.clear}
    >
      <svg width="100%" height={layout.height} className="block overflow-visible">
        {layout.today !== null && (
          <line
            aria-hidden="true"
            x1="0"
            x2="100%"
            y1={layout.today}
            y2={layout.today}
            strokeDasharray="3 5"
            className="stroke-primary/30"
          />
        )}
        {/* A nested SVG puts the origin on the trunk. x values are pixels from the trunk. */}
        <svg x={columns === "one" ? ONE_COLUMN_AXIS : "50%"} overflow="visible">
          {/* The branches are below the trunk and its chips. */}
          <g aria-hidden="true">
            {layout.marks.map((mark) => (
              <Branch key={mark.entry.id} mark={mark} dimmed={isDimmed(mark)} />
            ))}
          </g>
          <Axis layout={layout} ticks={ticks} trunk={trunk} />
          {activeMark && (
            <g aria-hidden="true" className="pointer-events-none">
              {dates.map((date) => (
                <Chip
                  key={date.y}
                  y={date.y}
                  label={date.label}
                  kind="date"
                  color={SIDE_COLORS[activeMark.colorSide]}
                />
              ))}
            </g>
          )}
          <foreignObject
            x={-GEOMETRY.trunkWidth / 2}
            y={0}
            width={GEOMETRY.trunkWidth}
            height={layout.height}
            className="overflow-visible"
          >
            <button
              type="button"
              aria-label={`Farbe des Stamms ändern, jetzt ${TRUNKS[trunk].label}`}
              className="block h-full w-full cursor-pointer rounded-full outline-none hover:bg-foreground/10 focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onClick={onTrunkClick}
              onPointerMove={(event) => {
                // The button starts at the top of the picture: its offset is the height in it.
                setTrunkHover(event.nativeEvent.offsetY);
              }}
              onPointerLeave={() => {
                setTrunkHover(null);
              }}
            />
          </foreignObject>
          {/* The rings of the points are on top of the trunk and its button: the mouse on a ring is on the entry. */}
          <g aria-hidden="true">
            {layout.marks.map((mark) => (
              <PointRing key={mark.entry.id} mark={mark} dimmed={isDimmed(mark)} />
            ))}
          </g>
          {trunkHover !== null && (
            <g aria-hidden="true" className="pointer-events-none">
              <Chip y={trunkHover} label="Klicken: Farbe ändern" kind="hint" />
            </g>
          )}
        </svg>
        {layout.marks.map((mark) => (
          <MarkCard
            key={mark.entry.id}
            mark={mark}
            columns={columns}
            today={today}
            dimmed={isDimmed(mark)}
            showBubble={isActive(mark) && !card.active.dismissed}
            bubble={card.active.places.get(mark.entry.id) ?? DEFAULT_PLACE}
            onCloseBubble={card.dismiss}
            actions={actions}
          />
        ))}
      </svg>
    </div>
  );
}

type ChipProps = {
  y: number;
  label: string;
  kind: "tick" | "today" | "gap" | "date" | "hint";
  /** The border color of a date chip: the color of the branch. */
  color?: string;
};

/**
 * A rounded chip on the trunk, for example "2015", "Heute" or "6 Jahre". A date chip shows a date
 * of the active entry, with a border in the color of its branch. A hint chip follows the mouse on
 * the trunk and tells what a click on the trunk does.
 */
function Chip({ y, label, kind, color }: ChipProps) {
  const width = label.length * 6 + 14;
  return (
    <g>
      <rect
        x={-width / 2}
        y={y - CHIP_HEIGHT / 2}
        width={width}
        height={CHIP_HEIGHT}
        rx={CHIP_HEIGHT / 2}
        strokeDasharray={kind === "gap" ? "3 2" : undefined}
        stroke={color}
        strokeWidth={kind === "date" ? 1.5 : 1}
        className={CHIP_RECTS[kind]}
      />
      <text x={0} y={y} dy="0.35em" textAnchor="middle" className={CHIP_TEXTS[kind]}>
        {label}
      </text>
    </g>
  );
}

const CHIP_RECTS: Record<ChipProps["kind"], string> = {
  tick: "fill-background stroke-border",
  gap: "fill-background stroke-border",
  today: "fill-primary stroke-primary",
  date: "fill-card",
  hint: "fill-foreground stroke-foreground",
};

const CHIP_TEXTS: Record<ChipProps["kind"], string> = {
  tick: "fill-muted-foreground text-[10px] font-medium",
  gap: "fill-muted-foreground text-[10px] font-medium",
  today: "fill-primary-foreground text-[10px] font-semibold",
  date: "fill-foreground text-[10px] font-semibold",
  hint: "fill-background text-[10px] font-medium",
};

type AxisProps = {
  layout: Layout;
  /** The tick chips to show: the ticks of the layout without those near a date chip. */
  ticks: Layout["ticks"];
  trunk: TrunkColor;
};

/** The trunk with its chips: years or months, cut gaps and today. */
function Axis({ layout, ticks, trunk }: AxisProps) {
  const { color, opacity } = TRUNKS[trunk];
  // The trunk fades in at the top and out at the bottom.
  const gradientId = `axis-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const fade = Math.min(0.08, 24 / Math.max(layout.height, 1));
  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={0}
          x2={0}
          y1={0}
          y2={layout.height}
        >
          <stop offset={0} stopColor={color} stopOpacity={0} />
          <stop offset={fade} stopColor={color} stopOpacity={opacity} />
          <stop offset={1 - fade} stopColor={color} stopOpacity={opacity} />
          <stop offset={1} stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {layout.segments.map((segment) => (
        <rect
          key={segment.top}
          x={-GEOMETRY.trunkWidth / 2}
          y={segment.top - GEOMETRY.pad}
          width={GEOMETRY.trunkWidth}
          height={segment.bottom - segment.top + 2 * GEOMETRY.pad}
          rx={GEOMETRY.trunkWidth / 2}
          fill={`url(#${gradientId})`}
        />
      ))}
      {layout.breaks.map((gap) => (
        <g key={gap.top}>
          <line
            x1={0}
            x2={0}
            y1={gap.top}
            y2={gap.bottom}
            strokeDasharray="0 10"
            strokeLinecap="round"
            strokeWidth={GEOMETRY.trunkWidth / 2}
            className="stroke-muted-foreground/30"
          />
          <Chip y={(gap.top + gap.bottom) / 2} label={gap.label} kind="gap" />
        </g>
      ))}
      {ticks.map((tick) => (
        <Chip key={tick.y} y={tick.y} label={tick.label} kind="tick" />
      ))}
      {layout.today !== null && <Chip y={layout.today} label="Heute" kind="today" />}
    </g>
  );
}

/** Rounds to 0.1 px for a short path text. */
function pathNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/**
 * The branch of an entry: from the edge of the trunk to the card. Two curves make its outline. At
 * the trunk, the branch of a range goes from the start to the end of the range, and the branch of
 * a point is 10 px thick. At the card, each branch is 3 px thick.
 */
function Branch({ mark, dimmed }: { mark: Mark; dimmed: boolean }) {
  const sign = mark.side === "left" ? -1 : 1;
  const isPoint = mark.entry.when.kind === "point";
  const top = isPoint ? mark.y1 - POINT_BRANCH / 2 : mark.y1;
  const bottom = isPoint ? mark.y1 + POINT_BRANCH / 2 : mark.y2;
  const to = mark.labelTop + GEOMETRY.labelHeight / 2;
  const x0 = sign * (GEOMETRY.trunkWidth / 2);
  const x1 = sign * GEOMETRY.labelEdge;
  const middle = (x0 + x1) / 2;
  const end = BRANCH_END / 2;
  const d = [
    `M ${pathNumber(x0)} ${pathNumber(top)}`,
    `C ${pathNumber(middle)} ${pathNumber(top)} ${pathNumber(middle)} ${pathNumber(to - end)} ${pathNumber(x1)} ${pathNumber(to - end)}`,
    `L ${pathNumber(x1)} ${pathNumber(to + end)}`,
    `C ${pathNumber(middle)} ${pathNumber(to + end)} ${pathNumber(middle)} ${pathNumber(bottom)} ${pathNumber(x0)} ${pathNumber(bottom)}`,
    "Z",
  ].join(" ");
  const hidden = !mark.entry.visible;
  const color = SIDE_COLORS[mark.colorSide];
  return (
    <path
      {...{ [BRANCH_ATTRIBUTE]: mark.entry.id }}
      d={d}
      fill={color}
      fillOpacity={hidden ? 0.1 : 0.35}
      stroke={color}
      strokeOpacity={hidden ? 0.5 : 0.8}
      strokeDasharray={hidden ? "3 3" : undefined}
      className={dimmed ? "opacity-25 transition-opacity" : "transition-opacity"}
    />
  );
}

/** The ring of a point, on the edge of the trunk. A range has no ring. */
function PointRing({ mark, dimmed }: { mark: Mark; dimmed: boolean }) {
  if (mark.entry.when.kind !== "point") return null;
  const hidden = !mark.entry.visible;
  return (
    <circle
      {...{ [BRANCH_ATTRIBUTE]: mark.entry.id }}
      cx={(mark.side === "left" ? -1 : 1) * (GEOMETRY.trunkWidth / 2)}
      cy={mark.y1}
      r={POINT_RADIUS}
      stroke={SIDE_COLORS[mark.colorSide]}
      strokeWidth={hidden ? 1.5 : 3}
      strokeDasharray={hidden ? "2 2" : undefined}
      className={
        dimmed ? "fill-card opacity-25 transition-opacity" : "fill-card transition-opacity"
      }
    />
  );
}
