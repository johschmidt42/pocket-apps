import { planBlocks, type PlanBlock } from "./plan.ts";

type Keyed<T> = T & { key: string };

/** A key from the text. The same text can come twice, so a counter makes it unique. */
function withKeys(blocks: readonly PlanBlock[]): Keyed<PlanBlock>[] {
  const seen = new Map<string, number>();
  return blocks.map((block) => {
    const text = `${block.kind}:${block.text}`;
    const count = (seen.get(text) ?? 0) + 1;
    seen.set(text, count);
    return { ...block, key: `${text}#${String(count)}` };
  });
}

type Exercise = Keyed<Extract<PlanBlock, { kind: "exercise" }>>;
type Group =
  | { kind: "exercises"; key: string; items: Exercise[] }
  | Keyed<Exclude<PlanBlock, { kind: "exercise" }>>;

/** Puts the exercises that follow each other into one list. */
function group(blocks: readonly Keyed<PlanBlock>[]): Group[] {
  const groups: Group[] = [];
  for (const block of blocks) {
    if (block.kind !== "exercise") {
      groups.push(block);
      continue;
    }
    const last = groups.at(-1);
    if (last?.kind === "exercises") last.items.push(block);
    else groups.push({ kind: "exercises", key: `list-${block.key}`, items: [block] });
  }
  return groups;
}

/**
 * The prescription of a workout: headings, a list of the exercises with their amounts in a
 * column, details such as "Barbell: 43/29 kg", and notes.
 */
export function PlanView({ lines, notes }: { lines: readonly string[]; notes: readonly string[] }) {
  return (
    <div className="flex flex-col gap-3">
      {group(withKeys(planBlocks(lines, notes))).map((item) => {
        switch (item.kind) {
          case "heading":
            return item.scheme === null ? (
              <p key={item.key} className="font-semibold">
                {item.text}
              </p>
            ) : (
              <p key={item.key} className="flex flex-col">
                <span className="text-2xl font-black tracking-tight tabular-nums">
                  {item.scheme}
                </span>
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </p>
            );
          case "exercises":
            // Without any amount, the list needs no amount column.
            if (item.items.every((exercise) => exercise.amount === null)) {
              return (
                <ul key={item.key} className="flex flex-col divide-y">
                  {item.items.map((exercise) => (
                    <li key={exercise.key} className="py-2 text-lg font-medium">
                      {exercise.text}
                    </li>
                  ))}
                </ul>
              );
            }
            return (
              // One grid for all rows: the amount column is as wide as the widest amount.
              <ul key={item.key} className="grid grid-cols-[max-content_1fr] gap-x-4">
                {item.items.map((exercise) => (
                  <li
                    key={exercise.key}
                    className="col-span-2 grid grid-cols-subgrid items-baseline border-b py-2 last:border-b-0"
                  >
                    <span className="text-right text-xl font-black tabular-nums">
                      {exercise.amount ?? (
                        <span aria-hidden="true" className="text-muted-foreground">
                          •
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 text-lg font-medium">{exercise.text}</span>
                  </li>
                ))}
              </ul>
            );
          case "detail":
            return (
              <p key={item.key} className="text-sm">
                <span className="font-semibold">{item.label}:</span>{" "}
                <span className="text-muted-foreground">{item.text}</span>
              </p>
            );
          case "note":
            return (
              <p key={item.key} className="text-sm text-muted-foreground">
                {item.text}
              </p>
            );
        }
      })}
    </div>
  );
}
