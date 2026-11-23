// In which order the parts of a figure are drawn: far parts first, near parts over them.
//
// One depth for each part is not enough. A torso that leans toward the camera is long in depth.
// An arm can be behind its near end and in front of its far end.
// So two body parts that overlap in the picture are compared at the place where they overlap.

export type FlatPoint = { x: number; y: number; depth: number };

export type Part<Node> = {
  /** The depth of the middle of the part. A larger depth is nearer to the camera. */
  depth: number;
  node: Node;
  id?: string;
  /** The part as a thick line in the picture, from `a` to `b`, `half` wide to each side. */
  shape?: { a: FlatPoint; b: FlatPoint; half: number };
  /** A patch at a joint: it is drawn over these parts. */
  over?: readonly string[];
};

type Entry<Node> = { part: Part<Node>; index: number; before: Set<Entry<Node>> };

const STEPS = 10;

const pointOn = (shape: { a: FlatPoint; b: FlatPoint }, t: number): FlatPoint => ({
  x: shape.a.x + (shape.b.x - shape.a.x) * t,
  y: shape.a.y + (shape.b.y - shape.a.y) * t,
  depth: shape.a.depth + (shape.b.depth - shape.a.depth) * t,
});

/** 1: `first` is in front of `second` where they overlap. -1: behind. 0: no overlap, or the same depth. */
function inFront<Node>(first: Part<Node>, second: Part<Node>): number {
  if (first.shape === undefined || second.shape === undefined) return 0;
  let nearest = Infinity;
  let difference = 0;
  for (let i = 0; i <= STEPS; i++) {
    const p = pointOn(first.shape, i / STEPS);
    for (let j = 0; j <= STEPS; j++) {
      const q = pointOn(second.shape, j / STEPS);
      const distance = Math.hypot(p.x - q.x, p.y - q.y);
      if (distance < nearest) {
        nearest = distance;
        difference = p.depth - q.depth;
      }
    }
  }
  if (nearest > first.shape.half + second.shape.half) return 0;
  return Math.abs(difference) < 0.5 ? 0 : Math.sign(difference);
}

/** All entries that are left and must be drawn before this one, also over other entries. */
function needs<Node>(entry: Entry<Node>, left: ReadonlySet<Entry<Node>>): Entry<Node>[] {
  const found = new Set<Entry<Node>>();
  const open = [entry];
  for (let current = open.pop(); current !== undefined; current = open.pop()) {
    for (const before of current.before) {
      if (left.has(before) && !found.has(before)) {
        found.add(before);
        open.push(before);
      }
    }
  }
  return [...found];
}

const farthest = <Node>(entries: readonly Entry<Node>[]): Entry<Node> | undefined =>
  entries.reduce<Entry<Node> | undefined>((best, entry) => {
    if (best === undefined) return entry;
    const closer = entry.part.depth - best.part.depth || entry.index - best.index;
    return closer < 0 ? entry : best;
  }, undefined);

/** The parts in the order in which to draw them. */
export function drawOrder<Node>(parts: readonly Part<Node>[]): Part<Node>[] {
  const entries = parts.map((part, index): Entry<Node> => ({
    part,
    index,
    before: new Set<Entry<Node>>(),
  }));
  const byId = new Map<string, Entry<Node>>();
  for (const entry of entries) if (entry.part.id !== undefined) byId.set(entry.part.id, entry);
  entries.forEach((first, index) => {
    for (const second of entries.slice(index + 1)) {
      const sign = inFront(first.part, second.part);
      if (sign > 0) first.before.add(second);
      if (sign < 0) second.before.add(first);
    }
  });
  // The comparisons of the body parts, before the patches add theirs.
  const behind = new Map(entries.map((entry) => [entry, new Set(entry.before)]));
  const isBehind = (entry: Entry<Node>, other: Entry<Node>) =>
    behind.get(entry)?.has(other) === true;
  for (const patch of entries) {
    const parents = (patch.part.over ?? []).flatMap((id) => byId.get(id) ?? []);
    for (const parent of parents) patch.before.add(parent);
    // What is in front of a parent is in front of the patch too. But not a part that is behind
    // another parent (a torso between the upper arm and the forearm): the order would have no start.
    for (const other of entries) {
      if (other === patch || other.part.over !== undefined || parents.includes(other)) continue;
      const inFrontOfOne = parents.some((parent) => isBehind(other, parent));
      const behindOne = parents.some((parent) => isBehind(parent, other));
      if (inFrontOfOne && !behindOne) other.before.add(patch);
    }
  }
  const left = new Set(entries);
  const result: Part<Node>[] = [];
  const isFree = (entry: Entry<Node>) => [...entry.before].every((before) => !left.has(before));
  for (let wanted = farthest([...left]); wanted !== undefined; wanted = farthest([...left])) {
    // Take the farthest part. If other parts must come first, take the farthest of those that can
    // be drawn now. If none can (the comparisons contradict one another), take the farthest anyway.
    const next = isFree(wanted) ? wanted : (farthest(needs(wanted, left).filter(isFree)) ?? wanted);
    left.delete(next);
    result.push(next.part);
  }
  return result;
}
