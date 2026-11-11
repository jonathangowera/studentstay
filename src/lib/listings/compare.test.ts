import { describe, expect, it } from "vitest";
import { MAX_COMPARE, compareHref, lowestPriceIds, nearestIds, parseCompareIds, toggleCompare } from "./compare";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";

describe("parseCompareIds", () => {
  it("allows up to three", () => {
    expect(MAX_COMPARE).toBe(3);
    expect(parseCompareIds(`${A},${B},${C}`)).toEqual({ ids: [A, B, C], tooMany: false, invalid: false });
  });
  it("keeps only the first three and says there were more", () => {
    expect(parseCompareIds(`${A},${B},${C},${D}`)).toEqual({ ids: [A, B, C], tooMany: true, invalid: false });
  });
  it("drops duplicates before counting", () => {
    expect(parseCompareIds(`${A},${A},${B},${B},${C}`)).toEqual({ ids: [A, B, C], tooMany: false, invalid: false });
  });
  it("ignores values that are not ids", () => {
    expect(parseCompareIds(`${A},nope,1;drop table`)).toEqual({ ids: [A], tooMany: false, invalid: true });
  });
  it("handles nothing, repeated params and upper case", () => {
    expect(parseCompareIds(undefined).ids).toEqual([]);
    expect(parseCompareIds("").ids).toEqual([]);
    expect(parseCompareIds([A, B.toUpperCase()]).ids).toEqual([A, B]);
  });
});

describe("toggleCompare", () => {
  it("adds and removes", () => {
    expect(toggleCompare([], A, true)).toEqual({ selected: [A], blocked: false });
    expect(toggleCompare([A, B], A, false)).toEqual({ selected: [B], blocked: false });
    expect(toggleCompare([A], A, true)).toEqual({ selected: [A], blocked: false });
  });
  it("blocks a fourth place and keeps the selection", () => {
    expect(toggleCompare([A, B, C], D, true)).toEqual({ selected: [A, B, C], blocked: true });
  });
  it("still allows removing when full", () => {
    expect(toggleCompare([A, B, C], B, false)).toEqual({ selected: [A, C], blocked: false });
  });
});

describe("compare highlights", () => {
  it("marks the lowest price, including ties", () => {
    expect(lowestPriceIds([{ id: A, price_from: 1350 }, { id: B, price_from: 900 }, { id: C, price_from: 900 }])).toEqual([B, C]);
  });
  it("marks nothing when there is nothing to compare", () => {
    expect(lowestPriceIds([{ id: A, price_from: 1350 }])).toEqual([]);
    expect(lowestPriceIds([{ id: A, price_from: null }, { id: B, price_from: 900 }])).toEqual([]);
  });
  it("marks the nearest, ignoring unknown distances", () => {
    expect(nearestIds([{ id: A, km: 2.6 }, { id: B, km: 1.1 }, { id: C, km: null }])).toEqual([B]);
    expect(nearestIds([{ id: A, km: null }, { id: B, km: 1.1 }])).toEqual([]);
  });
  it("builds the compare link", () => {
    expect(compareHref([A, B], "UNZA")).toBe(`/compare?ids=${A}%2C${B}&institution=UNZA`);
    expect(compareHref([])).toBe("/compare");
  });
});
