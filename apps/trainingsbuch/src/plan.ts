// The prescription of a workout as blocks: headings, exercises and notes. The built-in
// workouts have only text lines, so this module sorts them with a few rules.

/** One block of a prescription. `amount` is the number in front, for example "21" or "400 m". */
export type PlanBlock =
  /** `scheme`: a rep scheme in front, for example "21-15-9". Then `text` is the rest. */
  | { kind: "heading"; scheme: string | null; text: string }
  | { kind: "exercise"; amount: string | null; text: string }
  | { kind: "detail"; label: string; text: string }
  | { kind: "note"; text: string };

/** A number in front of an exercise: "21", "21-15-9", "400 m", "20 ×", "14/12". */
const AMOUNT = /^(\d[\d.,/]*(?:-\d[\d.,/]*)*(?: ?(?:×|(?:m|km|cal|s|ft|in)\b))?) (.+)$/;

/** Calories written as one word: "50-calorie row", "14/12-calorie row". */
const CALORIES = /^(\d[\d/]*)-calorie (.+)$/;

/** A rep scheme at the start of a heading: "21-15-9 reps for time of". */
const SCHEME = /^(\d+(?:-\d+){2,}) (.+)$/;

/** A time window of the clock: "0:00-3:00: 2 rounds of …". */
const TIME_WINDOW = /^(\d+:\d\d-\d+:\d\d): (.+)$/;

/** "Barbell: 43/29 kg": a label and a value. */
const DETAIL = /^([A-Z][A-Za-z -]*): (.+)$/;

/** The first words of a note, for example "Rest 3 minutes" or "Time cap: 5 minutes". */
const NOTE_START =
  /^(rest|partition|with|if|starts|score|then|after|every|record|add|stop|etc|in the|before|when|touch)/i;

/** An exercise line without a number is short: "Double-under", "Thruster, 43/29 kg". */
const MAX_EXERCISE_LENGTH = 60;

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("en") + text.slice(1);
}

/**
 * The block of one text line of a built-in workout. `afterHeading`: the line comes directly
 * after a heading. Then also a long line is an exercise ("Burpee, push-up, jumping jack, …").
 */
export function lineBlock(line: string, afterHeading = false): PlanBlock {
  if (line.endsWith(":")) {
    const heading = line.slice(0, -1);
    const scheme = SCHEME.exec(heading);
    return scheme?.[1] !== undefined && scheme[2] !== undefined
      ? { kind: "heading", scheme: scheme[1], text: scheme[2] }
      : { kind: "heading", scheme: null, text: heading };
  }
  const calories = CALORIES.exec(line);
  if (calories?.[1] !== undefined && calories[2] !== undefined) {
    return { kind: "exercise", amount: `${calories[1]} cal`, text: capitalize(calories[2]) };
  }
  const amount = AMOUNT.exec(line);
  if (amount?.[1] !== undefined && amount[2] !== undefined) {
    return { kind: "exercise", amount: amount[1], text: capitalize(amount[2]) };
  }
  const window = TIME_WINDOW.exec(line);
  if (window?.[1] !== undefined && window[2] !== undefined) {
    return { kind: "exercise", amount: window[1], text: capitalize(window[2]) };
  }
  const detail = DETAIL.exec(line);
  if (detail?.[1] !== undefined && detail[2] !== undefined) {
    return { kind: "detail", label: detail[1], text: detail[2] };
  }
  if (NOTE_START.test(line)) return { kind: "note", text: line };
  if (line.length > MAX_EXERCISE_LENGTH && !afterHeading) return { kind: "note", text: line };
  return { kind: "exercise", amount: null, text: line };
}

/**
 * The blocks of a prescription. `lines` are sorted with the rules above. `notes` are
 * always notes (the notes of an own workout).
 */
export function planBlocks(lines: readonly string[], notes: readonly string[] = []): PlanBlock[] {
  const blocks: PlanBlock[] = [];
  for (const line of lines) blocks.push(lineBlock(line, blocks.at(-1)?.kind === "heading"));
  return [...blocks, ...notes.map((text): PlanBlock => ({ kind: "note", text }))];
}
