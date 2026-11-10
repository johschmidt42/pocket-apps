import { describe, expect, it } from "vitest";
import {
  amountPer,
  centsToInput,
  formatEuro,
  formatEuroShort,
  parseEuro,
  paysInMonth,
} from "./money.ts";

// Intl puts a narrow no-break space before "€". Compare without it.
const plain = (text: string) => text.replace(/\s/g, " ");

describe("formatEuro", () => {
  it("formats cents as euros, with or without cents", () => {
    expect(plain(formatEuro(123456))).toBe("1.234,56 €");
    expect(plain(formatEuro(123456, true))).toBe("1.235 €");
  });

  it("keeps the cents below 100 € in short labels", () => {
    expect(plain(formatEuroShort(1399))).toBe("13,99 €");
    expect(plain(formatEuroShort(123456))).toBe("1.235 €");
  });
});

describe("parseEuro", () => {
  it.each([
    ["12,50", 1250],
    ["1.234,56", 123456],
    ["85", 8500],
    ["9,99 €", 999],
    ["0", 0],
  ])("reads %j as %d cents", (text, cents) => {
    expect(parseEuro(text)).toBe(cents);
  });

  it.each(["", "abc", "-5", "10.000.000,01"])("returns null for %j", (text) => {
    expect(parseEuro(text)).toBeNull();
  });
});

describe("centsToInput", () => {
  it("leaves out zero cents", () => {
    expect(centsToInput(5000)).toBe("50");
    expect(centsToInput(123456)).toBe("1234,56");
    expect(centsToInput(1205)).toBe("12,05");
  });
});

describe("amountPer", () => {
  it("converts each interval to a month and a year", () => {
    expect(amountPer({ amountCents: 1200, interval: "monthly" }, "month")).toBe(1200);
    expect(amountPer({ amountCents: 1200, interval: "quarterly" }, "month")).toBe(400);
    expect(amountPer({ amountCents: 1200, interval: "half-yearly" }, "month")).toBe(200);
    expect(amountPer({ amountCents: 1200, interval: "yearly" }, "month")).toBe(100);
    expect(amountPer({ amountCents: 1200, interval: "yearly" }, "year")).toBe(1200);
    expect(amountPer({ amountCents: 1200, interval: "monthly" }, "year")).toBe(14400);
  });
});

describe("paysInMonth", () => {
  const months = (entry: Parameters<typeof paysInMonth>[0]) =>
    Array.from({ length: 12 }, (_, index) => index + 1).filter((month) =>
      paysInMonth(entry, month),
    );

  it("finds the months of each payment", () => {
    expect(months({ interval: "monthly", dueMonth: 5 })).toHaveLength(12);
    expect(months({ interval: "quarterly", dueMonth: 2 })).toEqual([2, 5, 8, 11]);
    expect(months({ interval: "half-yearly", dueMonth: 9 })).toEqual([3, 9]);
    expect(months({ interval: "yearly", dueMonth: 12 })).toEqual([12]);
  });
});
