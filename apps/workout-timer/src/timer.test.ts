import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  completedRounds,
  countsRounds,
  describeTimer,
  formatClock,
  lastCue,
  positionAt,
  workoutMs,
} from "./timer.ts";

/** The lead-in of the timers in these tests: 10 s. */
const LEAD_IN_MS = 10_000;

describe("buildTimeline", () => {
  it("gives For Time without a time cap one open work segment", () => {
    const timeline = buildTimeline({ leadInSeconds: 10, mode: "for-time", capSeconds: null });

    expect(timeline.segments).toEqual([
      { kind: "lead-in", startMs: 0, durationMs: LEAD_IN_MS, round: null },
      { kind: "work", startMs: LEAD_IN_MS, durationMs: null, round: null },
    ]);
    expect(timeline.endMs).toBeNull();
    expect(timeline.rounds).toBeNull();
  });

  it("ends For Time at the time cap", () => {
    const timeline = buildTimeline({ leadInSeconds: 10, mode: "for-time", capSeconds: 600 });

    expect(timeline.endMs).toBe(LEAD_IN_MS + 600_000);
  });

  it("gives AMRAP one work segment", () => {
    const timeline = buildTimeline({ leadInSeconds: 10, mode: "amrap", seconds: 720 });

    expect(timeline.segments[1]).toEqual({
      kind: "work",
      startMs: LEAD_IN_MS,
      durationMs: 720_000,
      round: null,
    });
    expect(timeline.endMs).toBe(LEAD_IN_MS + 720_000);
  });

  it("gives EMOM one work segment per round", () => {
    const timeline = buildTimeline({
      leadInSeconds: 10,
      mode: "emom",
      intervalSeconds: 60,
      rounds: 3,
    });

    expect(timeline.segments.map((segment) => [segment.kind, segment.round])).toEqual([
      ["lead-in", null],
      ["work", 1],
      ["work", 2],
      ["work", 3],
    ]);
    expect(timeline.rounds).toBe(3);
    expect(timeline.endMs).toBe(LEAD_IN_MS + 180_000);
  });

  it("gives Tabata work and rest, without a rest after the last round", () => {
    const timeline = buildTimeline({
      leadInSeconds: 10,
      mode: "tabata",
      workSeconds: 20,
      restSeconds: 10,
      rounds: 2,
    });

    expect(
      timeline.segments.map((segment) => [segment.kind, segment.round, segment.startMs]),
    ).toEqual([
      ["lead-in", null, 0],
      ["work", 1, 10_000],
      ["rest", 1, 30_000],
      ["work", 2, 40_000],
    ]);
    expect(timeline.endMs).toBe(60_000);
  });
});

describe("buildTimeline without a lead-in", () => {
  const timeline = buildTimeline({ leadInSeconds: 0, mode: "amrap", seconds: 60 });

  it("starts the work at 0", () => {
    expect(timeline.leadInMs).toBe(0);
    expect(positionAt(timeline, 0).segment.kind).toBe("work");
    expect(timeline.endMs).toBe(60_000);
    expect(workoutMs(timeline, 30_000)).toBe(30_000);
  });

  it("plays the work tone at 0 when asked from -1", () => {
    expect(lastCue(timeline, -1, 0)).toBe("work");
    expect(lastCue(timeline, 0, 100)).toBeNull();
  });
});

describe("positionAt", () => {
  const tabata = buildTimeline({
    leadInSeconds: 10,
    mode: "tabata",
    workSeconds: 20,
    restSeconds: 10,
    rounds: 2,
  });

  it("starts in the lead-in", () => {
    expect(positionAt(tabata, 0)).toEqual({
      segment: tabata.segments[0],
      inSegmentMs: 0,
      leftMs: LEAD_IN_MS,
      done: false,
    });
  });

  it("finds the segment and the time left in it", () => {
    const position = positionAt(tabata, 32_500);

    expect(position.segment.kind).toBe("rest");
    expect(position.segment.round).toBe(1);
    expect(position.inSegmentMs).toBe(2500);
    expect(position.leftMs).toBe(7500);
    expect(position.done).toBe(false);
  });

  it("is done at the end", () => {
    const position = positionAt(tabata, 61_000);

    expect(position.segment.round).toBe(2);
    expect(position.leftMs).toBe(0);
    expect(position.done).toBe(true);
  });

  it("has no time left in an open segment", () => {
    const timeline = buildTimeline({ leadInSeconds: 10, mode: "for-time", capSeconds: null });
    const position = positionAt(timeline, 3_600_000);

    expect(position.leftMs).toBeNull();
    expect(position.inSegmentMs).toBe(3_600_000 - LEAD_IN_MS);
    expect(position.done).toBe(false);
  });
});

describe("workoutMs", () => {
  const amrap = buildTimeline({ leadInSeconds: 10, mode: "amrap", seconds: 60 });

  it("is 0 during the lead-in", () => {
    expect(workoutMs(amrap, 4000)).toBe(0);
  });

  it("does not count the lead-in", () => {
    expect(workoutMs(amrap, LEAD_IN_MS + 5000)).toBe(5000);
  });

  it("stops at the end", () => {
    expect(workoutMs(amrap, LEAD_IN_MS + 120_000)).toBe(60_000);
  });

  it("has no end without a time cap", () => {
    const timeline = buildTimeline({ leadInSeconds: 10, mode: "for-time", capSeconds: null });

    expect(workoutMs(timeline, LEAD_IN_MS + 7_200_000)).toBe(7_200_000);
  });
});

describe("countsRounds", () => {
  it("is true for For Time and AMRAP only", () => {
    expect(countsRounds({ leadInSeconds: 10, mode: "for-time", capSeconds: null })).toBe(true);
    expect(countsRounds({ leadInSeconds: 10, mode: "amrap", seconds: 60 })).toBe(true);
    expect(countsRounds({ leadInSeconds: 10, mode: "emom", intervalSeconds: 60, rounds: 5 })).toBe(
      false,
    );
    expect(
      countsRounds({
        leadInSeconds: 10,
        mode: "tabata",
        workSeconds: 20,
        restSeconds: 10,
        rounds: 8,
      }),
    ).toBe(false);
  });
});

describe("completedRounds", () => {
  const tabata = buildTimeline({
    leadInSeconds: 10,
    mode: "tabata",
    workSeconds: 20,
    restSeconds: 10,
    rounds: 2,
  });
  const emom = buildTimeline({ leadInSeconds: 10, mode: "emom", intervalSeconds: 60, rounds: 3 });

  it("counts no round during the lead-in", () => {
    expect(completedRounds(tabata, 5000)).toBe(0);
  });

  it("does not count the round that still runs", () => {
    expect(completedRounds(tabata, LEAD_IN_MS + 5000)).toBe(0);
    expect(completedRounds(emom, LEAD_IN_MS + 65_000)).toBe(1);
  });

  it("counts a Tabata round after its work, in the rest", () => {
    expect(completedRounds(tabata, LEAD_IN_MS + 25_000)).toBe(1);
  });

  it("counts all rounds at the end", () => {
    expect(completedRounds(tabata, 999_999)).toBe(2);
    expect(completedRounds(emom, LEAD_IN_MS + 180_000)).toBe(3);
  });

  it("is 0 for modes without fixed rounds", () => {
    const amrap = buildTimeline({ leadInSeconds: 10, mode: "amrap", seconds: 60 });

    expect(completedRounds(amrap, LEAD_IN_MS + 30_000)).toBe(0);
    expect(completedRounds(amrap, LEAD_IN_MS + 90_000)).toBe(0);
  });
});

describe("lastCue", () => {
  const tabata = buildTimeline({
    leadInSeconds: 10,
    mode: "tabata",
    workSeconds: 20,
    restSeconds: 10,
    rounds: 2,
  });

  it("counts down 3, 2, 1 before the work starts", () => {
    expect(lastCue(tabata, 0, 6900)).toBeNull();
    expect(lastCue(tabata, 6900, 7000)).toBe("count");
    expect(lastCue(tabata, 7000, 8000)).toBe("count");
    expect(lastCue(tabata, 8000, 9000)).toBe("count");
  });

  it("plays a tone at the start of work and of rest", () => {
    expect(lastCue(tabata, 9900, 10_000)).toBe("work");
    expect(lastCue(tabata, 29_950, 30_050)).toBe("rest");
  });

  it("plays the end tone at the end", () => {
    expect(lastCue(tabata, 59_950, 60_050)).toBe("end");
  });

  it("plays only the newest tone after a late tick", () => {
    expect(lastCue(tabata, 26_000, 31_000)).toBe("rest");
  });

  it("plays nothing between the tones", () => {
    expect(lastCue(tabata, 12_000, 13_000)).toBeNull();
  });

  it("counts down only in the segment itself", () => {
    // 2 s of work: only the tone 1 s before the end is in the segment.
    const short = buildTimeline({
      leadInSeconds: 10,
      mode: "tabata",
      workSeconds: 2,
      restSeconds: 10,
      rounds: 1,
    });

    expect(lastCue(short, LEAD_IN_MS, LEAD_IN_MS + 999)).toBeNull();
    expect(lastCue(short, LEAD_IN_MS + 999, LEAD_IN_MS + 1000)).toBe("count");
  });

  it("has no end tone and no countdown without a time cap", () => {
    const timeline = buildTimeline({ leadInSeconds: 10, mode: "for-time", capSeconds: null });

    expect(lastCue(timeline, LEAD_IN_MS, 100_000_000)).toBeNull();
  });
});

describe("formatClock", () => {
  it("shows minutes and seconds", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(452)).toBe("7:32");
    expect(formatClock(3599)).toBe("59:59");
  });

  it("shows hours from one hour", () => {
    expect(formatClock(3600)).toBe("1:00:00");
    expect(formatClock(3725)).toBe("1:02:05");
  });
});

describe("describeTimer", () => {
  it("names each mode", () => {
    expect(describeTimer({ leadInSeconds: 10, mode: "for-time", capSeconds: null })).toBe(
      "For Time",
    );
    expect(describeTimer({ leadInSeconds: 10, mode: "for-time", capSeconds: 720 })).toBe(
      "For Time · Time Cap 12:00",
    );
    expect(describeTimer({ leadInSeconds: 10, mode: "amrap", seconds: 1200 })).toBe("AMRAP 20:00");
    expect(
      describeTimer({ leadInSeconds: 10, mode: "emom", intervalSeconds: 90, rounds: 10 }),
    ).toBe("EMOM 10 × 1:30");
    expect(
      describeTimer({
        leadInSeconds: 10,
        mode: "tabata",
        workSeconds: 20,
        restSeconds: 10,
        rounds: 8,
      }),
    ).toBe("Tabata 8 × 20 s / 10 s");
  });
});
