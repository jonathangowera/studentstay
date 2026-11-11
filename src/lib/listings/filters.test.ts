import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  effectiveSort,
  filtersToParams,
  hasActiveFilters,
  listingQueryPlan,
  listingsHref,
  pageCount,
  pageNumbers,
  parseListingFilters,
} from "./filters";

const parse = (qs: string) => parseListingFilters(new URLSearchParams(qs));

describe("parseListingFilters", () => {
  it("returns the defaults for an empty URL", () => {
    expect(parse("")).toEqual(EMPTY_FILTERS);
  });

  it("reads every filter", () => {
    const f = parse(
      "institution=unza&area=Kalingalinga&min=500&max=2000&type=private_rental&type=recognised_boarding_house" +
        "&room=double,single&gender=female_only&facilities=wifi&facilities=guard&free=1&fresh=1&sort=price&view=list&page=2",
    );
    expect(f).toEqual({
      institution: "UNZA",
      area: "Kalingalinga",
      min: 500,
      max: 2000,
      types: ["recognised_boarding_house", "private_rental"],
      rooms: ["single", "double"],
      genders: ["female_only"],
      facilities: ["wifi", "guard"],
      freeOnly: true,
      hideStale: true,
      sort: "price",
      view: "list",
      page: 2,
    });
  });

  it("accepts a plain object from Next.js searchParams", () => {
    const f = parseListingFilters({ type: ["private_rental", "university_hostel"], free: "on" });
    expect(f.types).toEqual(["university_hostel", "private_rental"]);
    expect(f.freeOnly).toBe(true);
  });

  it("drops values that are not allowed", () => {
    const f = parse("institution=<script>&type=castle&room=penthouse&gender=any&facilities=pool&sort=random&page=-3&min=abc&max=99999999");
    expect(f.institution).toBeNull();
    expect(f.types).toEqual([]);
    expect(f.rooms).toEqual([]);
    expect(f.genders).toEqual([]);
    expect(f.facilities).toEqual([]);
    expect(f.sort).toBe("best");
    expect(f.page).toBe(1);
    expect(f.min).toBeNull();
    expect(f.max).toBeNull();
  });

  it("removes duplicates", () => {
    expect(parse("room=single&room=single,single").rooms).toEqual(["single"]);
  });

  it("swaps min and max when they are the wrong way round", () => {
    const f = parse("min=3000&max=1000");
    expect([f.min, f.max]).toEqual([1000, 3000]);
  });

  it("reads the budget bands from the home page", () => {
    expect([parse("budget=0-1500").min, parse("budget=0-1500").max]).toEqual([null, 1500]);
    expect([parse("budget=1500-2500").min, parse("budget=1500-2500").max]).toEqual([1500, 2500]);
    expect([parse("budget=2500-").min, parse("budget=2500-").max]).toEqual([2500, null]);
    // Explicit min or max wins over the band.
    expect(parse("budget=0-1500&max=900").max).toBe(900);
  });

  it("ignores an over-long area", () => {
    expect(parse(`area=${"x".repeat(61)}`).area).toBeNull();
  });
});

describe("filtersToParams", () => {
  it("round-trips through the URL", () => {
    const qs =
      "institution=UNZA&area=Chelston&min=500&max=2000&type=private_rental&room=double&gender=mixed&facilities=wifi&free=1&fresh=1&sort=distance&view=list&page=3";
    const f = parse(qs);
    expect(parse(filtersToParams(f).toString())).toEqual(f);
  });

  it("leaves defaults out", () => {
    expect(filtersToParams(EMPTY_FILTERS).toString()).toBe("");
    expect(listingsHref(EMPTY_FILTERS)).toBe("/listings");
  });

  it("builds links with changes", () => {
    const f = parse("type=private_rental&page=4");
    expect(listingsHref(f, { page: 1, sort: "price" })).toBe("/listings?type=private_rental&sort=price");
  });

  it("knows when filters are active", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters(parse("sort=price&page=2&view=list"))).toBe(false);
    expect(hasActiveFilters(parse("fresh=1"))).toBe(true);
  });
});

describe("listingQueryPlan", () => {
  it("has no filters by default and sorts by best match", () => {
    const plan = listingQueryPlan(EMPTY_FILTERS);
    expect(plan.filters).toEqual([]);
    expect(plan.order.map((o) => [o.column, o.ascending])).toEqual([
      ["beds_available", false],
      ["last_updated_at", false],
      ["id", true],
    ]);
    expect([plan.from, plan.to]).toEqual([0, 11]);
  });

  it("turns each filter into a database filter", () => {
    const plan = listingQueryPlan(
      parse("institution=UNZA&area=Kalingalinga&min=500&max=2000&type=private_rental&gender=female_only&facilities=wifi,guard&room=double&fresh=1"),
    );
    expect(plan.filters).toEqual([
      { op: "notNull", column: "distances->UNZA" },
      { op: "eq", column: "area", value: "Kalingalinga" },
      { op: "lte", column: "price_from", value: 2000 },
      { op: "gte", column: "price_to", value: 500 },
      { op: "in", column: "type", value: ["private_rental"] },
      { op: "in", column: "gender", value: ["female_only"] },
      { op: "contains", column: "facilities", value: ["wifi", "guard"] },
      { op: "overlaps", column: "room_types", value: ["double"] },
      { op: "eq", column: "is_stale", value: false },
    ]);
  });

  it("uses free room types when only free beds are wanted", () => {
    const plan = listingQueryPlan(parse("room=single,quad&free=1"));
    expect(plan.filters).toEqual([
      { op: "overlaps", column: "free_room_types", value: ["single", "quad"] },
      { op: "gt", column: "beds_available", value: 0 },
    ]);
  });

  it("sorts by price, newest and distance", () => {
    expect(listingQueryPlan(parse("sort=price")).order[0]).toEqual({ column: "price_from", ascending: true, nullsFirst: false });
    expect(listingQueryPlan(parse("sort=updated")).order[0]).toEqual({
      column: "last_updated_at",
      ascending: false,
      nullsFirst: false,
    });
    expect(listingQueryPlan(parse("sort=distance&institution=ZCAS")).order[0]).toEqual({
      column: "distances->ZCAS",
      ascending: true,
      nullsFirst: false,
    });
  });

  it("always ends the order with the id so pages do not overlap", () => {
    for (const s of ["best", "price", "updated", "distance"]) {
      const order = listingQueryPlan(parse(`sort=${s}&institution=UNZA`)).order;
      expect(order[order.length - 1].column).toBe("id");
    }
  });

  it("falls back to best match for distance without an institution", () => {
    const f = parse("sort=distance");
    expect(effectiveSort(f)).toEqual({ sort: "best", distanceNeedsInstitution: true });
    expect(listingQueryPlan(f).order[0].column).toBe("beds_available");
  });

  it("lists page links with gaps", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(1, 3)).toEqual([1, 2, 3]);
    expect(pageNumbers(5, 10)).toEqual([1, "gap", 4, 5, 6, "gap", 10]);
    expect(pageNumbers(10, 10)).toEqual([1, "gap", 9, 10]);
  });

  it("pages 12 at a time", () => {
    const plan = listingQueryPlan(parse("page=3"));
    expect([plan.from, plan.to]).toEqual([24, 35]);
    expect(pageCount(0)).toBe(1);
    expect(pageCount(12)).toBe(1);
    expect(pageCount(13)).toBe(2);
  });
});
