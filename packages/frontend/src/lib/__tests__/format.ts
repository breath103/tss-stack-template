import { describe, expect, it } from "vitest";

import { formatCurrency, pluralize } from "../format";

describe("formatCurrency", () => {
  it("formats cents to USD", () => {
    expect(formatCurrency(1000)).toBe("$10.00");
    expect(formatCurrency(99)).toBe("$0.99");
    expect(formatCurrency(12345)).toBe("$123.45");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });
});

describe("pluralize", () => {
  it("returns singular for count of 1", () => {
    expect(pluralize(1, "item")).toBe("item");
  });

  it("returns plural for count !== 1", () => {
    expect(pluralize(0, "item")).toBe("items");
    expect(pluralize(2, "item")).toBe("items");
    expect(pluralize(100, "item")).toBe("items");
  });

  it("uses custom plural when provided", () => {
    expect(pluralize(2, "person", "people")).toBe("people");
  });
});
