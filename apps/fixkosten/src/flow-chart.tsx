import { Sankey } from "@pocket-apps/ui/charts";
import { ChartContainer } from "@pocket-apps/ui/components/chart";
import { chartHeightClass } from "./chart-height.ts";
import { shortLabel, type Flow } from "./flow.ts";
import { ICONS } from "./icons.ts";
import { formatEuroShort } from "./money.ts";

const ICON_SIZE = 14;
const GAP = 6;

/** The Sankey chart of a flow. Labels show the name and the amount of each node. */
export function FlowChart({ flow }: { flow: Flow }) {
  // The end nodes are the largest column. They set the height.
  const sources = new Set(flow.links.map((link) => link.source));
  const ends = flow.nodes.filter((_, index) => !sources.has(index)).length;
  const height = chartHeightClass(ends);

  return (
    // The chart needs room for the labels. In narrow windows, it scrolls sideways.
    <div className="overflow-x-auto">
      <ChartContainer config={{}} className={`aspect-auto min-w-[40rem] ${height}`}>
        <Sankey
          data={flow}
          nodePadding={32}
          nodeWidth={10}
          margin={{ top: 16, right: 8, bottom: 16, left: 8 }}
          link={(props) => {
            const link = flow.links[props.index];
            const target = link ? flow.nodes[link.target] : undefined;
            return (
              <path
                d={[
                  "M",
                  props.sourceX,
                  props.sourceY,
                  "C",
                  props.sourceControlX,
                  props.sourceY,
                  props.targetControlX,
                  props.targetY,
                  props.targetX,
                  props.targetY,
                ].join(" ")}
                fill="none"
                stroke={target?.color ?? "var(--chart-other)"}
                strokeOpacity={0.3}
                strokeWidth={Math.max(1, props.linkWidth)}
              />
            );
          }}
          node={(props) => {
            const node = flow.nodes[props.index];
            if (!node) return null;
            const Icon = node.icon ? ICONS[node.icon].icon : null;
            const label = shortLabel(node.name);
            // Only the first column has its labels on the right. All other labels go to the left
            // of their node. Then each gap between two columns has only one column of labels.
            const labelLeft = props.payload.depth > 0;
            const iconX = labelLeft ? props.x - GAP - ICON_SIZE : props.x + props.width + GAP;
            const iconSpace = Icon ? ICON_SIZE + 4 : 0;
            const textX = labelLeft
              ? props.x - GAP - iconSpace
              : props.x + props.width + GAP + iconSpace;
            const middle = props.y + props.height / 2;
            const anchor = labelLeft ? "end" : "start";
            return (
              <g>
                {label !== node.name && <title>{node.name}</title>}
                <rect
                  x={props.x}
                  y={props.y}
                  width={props.width}
                  height={Math.max(2, props.height)}
                  rx={2}
                  fill={node.color}
                />
                {Icon && (
                  <Icon
                    x={iconX}
                    y={middle - 13}
                    width={ICON_SIZE}
                    height={ICON_SIZE}
                    className="text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <text
                  x={textX}
                  y={middle - 2}
                  textAnchor={anchor}
                  className="fill-foreground stroke-card text-xs font-medium [paint-order:stroke]"
                  strokeWidth={3}
                >
                  {label}
                </text>
                <text
                  x={textX}
                  y={middle + 12}
                  textAnchor={anchor}
                  className="fill-muted-foreground stroke-card text-xs [paint-order:stroke]"
                  strokeWidth={3}
                >
                  {formatEuroShort(Number(props.payload.value))}
                </text>
              </g>
            );
          }}
        />
      </ChartContainer>
    </div>
  );
}
