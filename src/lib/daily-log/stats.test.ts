import { describe, it, expect } from "vitest";
import { topSeller, formatRevenue } from "@/lib/daily-log/stats";

describe("topSeller", () => {
  it("returns the item with the most units sold", () => {
    const result = topSeller([
      { item_name: "Al Pastor", units_sold: 62 },
      { item_name: "Birria", units_sold: 40 },
    ]);
    expect(result).toEqual({ item_name: "Al Pastor", units_sold: 62 });
  });

  it("ignores rows with null units_sold", () => {
    const result = topSeller([
      { item_name: "Al Pastor", units_sold: null },
      { item_name: "Birria", units_sold: 5 },
    ]);
    expect(result).toEqual({ item_name: "Birria", units_sold: 5 });
  });

  it("returns null when no row has units tracked", () => {
    expect(topSeller([{ item_name: "Al Pastor", units_sold: null }])).toBeNull();
    expect(topSeller([])).toBeNull();
  });
});

describe("formatRevenue", () => {
  it("formats cents as dollars", () => {
    expect(formatRevenue(124000)).toBe("$1,240");
  });

  it("returns a placeholder for null", () => {
    expect(formatRevenue(null)).toBe("—");
  });
});
