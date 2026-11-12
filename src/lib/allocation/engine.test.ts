import { describe, expect, it } from "vitest";
import {
  activeConstraints,
  bedFor,
  monthlyPrice,
  recommend,
  round,
  scoreAvailability,
  scoreBudget,
  scoreDistance,
  scoreFacilities,
  scoreRoomType,
} from "./engine";
import { MAX_EXCLUDED, TERM_MONTHS } from "./constants";
import type { EngineBed, EngineInput, EngineListing, EngineRoom } from "./types";

const NOW = new Date("2026-11-13T08:00:00Z");
const TODAY = "2026-11-13T06:00:00Z";
const APP = "app-1";

const listing = (over: Partial<EngineListing> = {}): EngineListing => ({
  id: "l-riverside",
  name: "Riverside Hall",
  rentUnit: "term",
  gender: "mixed",
  facilities: ["wifi", "water", "power", "guard", "fire", "study", "laundry"],
  lastUpdatedAt: TODAY,
  distanceKm: 0.3,
  partnered: true,
  ...over,
});

const bed = (id: string, label: string, state: EngineBed["state"] = "available", held: string | null = null): EngineBed => ({
  id,
  label,
  state,
  heldForApplicationId: held,
});

let n = 0;
const room = (over: Partial<EngineRoom> = {}): EngineRoom => {
  n++;
  return {
    id: `r${n}`,
    number: String(100 + n),
    type: "double",
    price: 4400,
    wing: "Block 3",
    gender: "female_only",
    listing: listing(),
    beds: [bed(`b${n}a`, "A")],
    ...over,
  };
};

const input = (rooms: EngineRoom[], over: Partial<EngineInput> = {}): EngineInput => ({
  application: { id: APP, institutionCode: "UNZA", roomType: "double", budget: 2000, gender: "female_only", facilities: ["wifi", "guard", "study"] },
  rule: {
    id: "rule-1",
    name: "UNZA Semester I 2027",
    version: 3,
    weights: { roomType: 25, budget: 25, distance: 25, facilities: 15, availability: 10 },
    hardConstraints: { bed_free: true, gender_policy: true, room_type: true, budget_ceiling: true, institution_eligible: true },
  },
  rooms,
  now: NOW,
  ...over,
});

// ---------------------------------------------------------------- the worked check from the live data

describe("worked check: UNZA, double, female only, K2,000, wifi + guard + study", () => {
  const riverside = listing();
  const block3 = Array.from({ length: 18 }, (_, i) => {
    const no = 301 + i;
    const free = [309, 310, 311, 313, 314, 317, 318].includes(no);
    return room({
      id: `rv-${no}`,
      number: String(no),
      wing: "Block 3",
      gender: "female_only",
      listing: riverside,
      beds: [bed(`rv-${no}-a`, "A", free ? "available" : "occupied"), bed(`rv-${no}-b`, "B", free ? "available" : "reserved")],
    });
  });
  const block2 = [room({ id: "rv-201", number: "201", wing: "Block 2", gender: "male_only", listing: riverside })];
  const block1 = [room({ id: "rv-101", number: "101", wing: "Block 1", type: "triple", price: 3600, gender: "female_only", listing: riverside })];
  const greatEast = room({
    id: "ge-112",
    number: "112",
    wing: null,
    gender: null,
    price: 1900,
    listing: listing({ id: "l-ge", name: "Great East Court", rentUnit: "month", gender: "mixed", distanceKm: 1.1 }),
  });
  const kalingalinga = room({
    id: "ka-5",
    number: "5",
    wing: null,
    gender: null,
    price: 1200,
    listing: listing({ id: "l-ka", name: "Kalingalinga Student Homes", rentUnit: "month", gender: "male_only", distanceKm: 2.6 }),
  });
  const result = recommend(input([...block3, ...block2, ...block1, greatEast, kalingalinga]));

  it("ranks block 3 rooms 309, 310, 311, 313 and 314 at 99.63", () => {
    expect(result.ranked.map((r) => r.room.number)).toEqual(["309", "310", "311", "313", "314"]);
    expect(result.ranked.map((r) => r.scores.total)).toEqual([99.63, 99.63, 99.63, 99.63, 99.63]);
    expect(result.ranked[0].scores).toEqual({ roomType: 100, budget: 100, distance: 98.5, facilities: 100, availability: 100, total: 99.63 });
    expect(result.ranked[0].bed.label).toBe("A");
  });

  it("excludes Great East Court and Kalingalinga for gender policy, and the other Riverside rooms with reasons", () => {
    const reason = (id: string) => result.excluded.find((e) => e.room.id === id)?.reason;
    expect(reason("ge-112")).toBe("Gender policy: mixed");
    expect(reason("ka-5")).toBe("Gender policy: male only");
    expect(reason("rv-201")).toBe("Gender policy: male only");
    expect(reason("rv-101")).toBe("Room type not requested (triple room)");
    expect(reason("rv-301")).toBe("No free bed in this room");
  });

  it("explains a ranked room in one plain sentence", () => {
    expect(result.ranked[0].explanation).toBe(
      "Double room, about K880 a month, within your budget, 0.3 km to UNZA. Has 3 of your 3 preferred facilities. Listing updated 0 days ago.",
    );
  });

  it("explains the run", () => {
    expect(result.explanation).toContain("Rule UNZA Semester I 2027, version 3.");
    expect(result.explanation).toContain("Hard constraints applied: institution recognition, free bed, gender policy, room type, budget ceiling.");
    expect(result.explanation).toContain("Weights: room type 25, budget 25, distance 25, facilities 15, availability 10.");
    expect(result.explanation).toContain("Hostel prices are shown per term and were converted to a monthly figure using 5 months.");
    expect(result.explanation).toContain("Considered 22 rooms: 7 eligible, 5 ranked, 15 excluded.");
    expect(result.explanation).not.toContain("—");
  });
});

// ---------------------------------------------------------------- hard constraints

describe("hard constraints", () => {
  it("excludes with each exact reason text", () => {
    const r = recommend(
      input([
        room({ id: "inst", listing: listing({ partnered: false }) }),
        room({ id: "bed", beds: [bed("x", "A", "occupied")] }),
        room({ id: "gen", gender: "male_only" }),
        room({ id: "type", type: "single" }),
        room({ id: "budget", price: 12_000 }),
      ]),
    );
    const reasons = Object.fromEntries(r.excluded.map((e) => [e.room.id, e.reason]));
    expect(reasons).toEqual({
      inst: "Not recognised for your institution",
      bed: "No free bed in this room",
      gen: "Gender policy: male only",
      type: "Room type not requested (single room)",
      budget: "Above your budget (K2,400 a month)",
    });
    expect(r.ranked).toEqual([]);
  });

  it("uses the FIRST failing reason in the agreed order", () => {
    const all = room({ listing: listing({ partnered: false }), beds: [], gender: "male_only", type: "single", price: 99_000 });
    expect(recommend(input([all])).excluded[0].reason).toBe("Not recognised for your institution");
    const fromBed = room({ beds: [], gender: "male_only", type: "single", price: 99_000 });
    expect(recommend(input([fromBed])).excluded[0].reason).toBe("No free bed in this room");
    const fromGender = room({ gender: "male_only", type: "single", price: 99_000 });
    expect(recommend(input([fromGender])).excluded[0].reason).toBe("Gender policy: male only");
    const fromType = room({ type: "single", price: 99_000 });
    expect(recommend(input([fromType])).excluded[0].reason).toBe("Room type not requested (single room)");
  });

  it("lets the room's own gender override the listing policy", () => {
    const mixedListing = listing({ gender: "mixed" });
    expect(recommend(input([room({ gender: "female_only", listing: mixedListing })])).ranked).toHaveLength(1);
    const femaleListing = listing({ gender: "female_only" });
    expect(recommend(input([room({ gender: null, listing: femaleListing })])).ranked).toHaveLength(1);
    expect(recommend(input([room({ gender: "male_only", listing: femaleListing })])).excluded[0].reason).toBe("Gender policy: male only");
    expect(recommend(input([room({ gender: null, listing: listing({ gender: null }) })])).excluded[0].reason).toBe("Gender policy: not stated");
  });

  it("treats a missing flag as switched on and false as switched off", () => {
    expect(activeConstraints({})).toEqual({ institution_eligible: true, bed_free: true, gender_policy: true, room_type: true, budget_ceiling: true });
    expect(activeConstraints(null).room_type).toBe(true);
    expect(activeConstraints({ room_type: false, budget_ceiling: "no" }).room_type).toBe(false);
    expect(activeConstraints({ budget_ceiling: "no" }).budget_ceiling).toBe(true);
  });

  it("scores other room types at 40 when the room type constraint is off", () => {
    const r = recommend(input([room({ type: "triple" })], { rule: { ...input([]).rule, hardConstraints: { room_type: false } } }));
    expect(r.ranked[0].scores.roomType).toBe(40);
    expect(r.ranked[0].explanation).toMatch(/^Triple room \(you asked for double\)/);
    expect(r.explanation).toContain("Switched off: room type.");
  });

  it("ranks rooms above the budget when the budget ceiling is off, scored by the ratio", () => {
    const rule = { ...input([]).rule, hardConstraints: { budget_ceiling: false } };
    const r = recommend(input([room({ price: 11_000 })], { rule })); // 2,200 a month: ratio 1.1
    expect(r.ranked[0].scores.budget).toBe(75);
    expect(r.ranked[0].explanation).toContain("K200 a month over your budget");
  });

  it("never ranks a room without a bed, even with bed_free switched off", () => {
    const rule = { ...input([]).rule, hardConstraints: { bed_free: false } };
    const r = recommend(input([room({ beds: [bed("x", "A", "occupied")] })], { rule }));
    expect(r.ranked).toEqual([]);
    expect(r.excluded[0].reason).toBe("No free bed in this room");
  });
});

// ---------------------------------------------------------------- beds

describe("bedFor", () => {
  it("reuses a bed held or pending for THIS application", () => {
    const beds = [bed("a", "A"), bed("b", "B", "pending_approval", APP), bed("c", "C", "held", "other")];
    expect(bedFor({ beds }, APP)?.id).toBe("b");
    expect(bedFor({ beds: [bed("a", "A"), bed("h", "H", "held", APP)] }, APP)?.id).toBe("h");
  });

  it("otherwise picks the lowest available label, in natural order", () => {
    expect(bedFor({ beds: [bed("c", "C"), bed("a", "B"), bed("x", "A", "reserved")] }, APP)?.label).toBe("B");
    expect(bedFor({ beds: [bed("10", "10"), bed("9", "9")] }, APP)?.label).toBe("9");
  });

  it("finds no bed when none is available or held for this application", () => {
    expect(bedFor({ beds: [bed("x", "A", "held", "other"), bed("y", "B", "occupied"), bed("z", "C", "blocked_for_maintenance")] }, APP)).toBeNull();
    expect(bedFor({ beds: [] }, APP)).toBeNull();
  });
});

// ---------------------------------------------------------------- scores

describe("score formulas", () => {
  it("room type: 100 or 40", () => {
    expect(scoreRoomType("double", "double")).toBe(100);
    expect(scoreRoomType("triple", "double")).toBe(40);
  });

  it("budget at the boundaries", () => {
    expect(scoreBudget(2000, 2000)).toBe(100);
    expect(scoreBudget(1000, 2000)).toBe(100);
    expect(scoreBudget(2200, 2000)).toBe(75);
    expect(scoreBudget(2400, 2000)).toBe(50);
    expect(scoreBudget(2401, 2000)).toBe(0);
    expect(scoreBudget(100, 0)).toBe(0);
  });

  it("distance: 100 - 5 per km, never below 0", () => {
    expect(scoreDistance(0)).toBe(100);
    expect(scoreDistance(0.3)).toBe(98.5);
    expect(scoreDistance(1.1)).toBe(94.5);
    expect(scoreDistance(20)).toBe(0);
    expect(scoreDistance(35)).toBe(0);
    expect(scoreDistance(null)).toBe(0);
  });

  it("facilities: share of the preferred ones, 100 when none were chosen", () => {
    expect(scoreFacilities(["wifi", "guard"], ["wifi", "guard", "study"])).toBe(66.7);
    expect(scoreFacilities(["wifi"], [])).toBe(100);
    expect(scoreFacilities([], ["wifi"])).toBe(0);
    expect(scoreFacilities(["wifi"], ["wifi", "wifi"])).toBe(100);
  });

  it("availability by days since the listing was updated", () => {
    expect(scoreAvailability(0)).toBe(100);
    expect(scoreAvailability(7)).toBe(100);
    expect(scoreAvailability(8)).toBe(98.3);
    expect(scoreAvailability(30)).toBe(60);
    expect(scoreAvailability(31)).toBe(30);
    expect(scoreAvailability(400)).toBe(30);
  });

  it("works out availability from the listing's last update in Central Africa Time", () => {
    const old = room({ listing: listing({ lastUpdatedAt: "2026-10-04T10:00:00Z" }) }); // 40 days
    const r = recommend(input([old]));
    expect(r.ranked[0].scores.availability).toBe(30);
    expect(r.ranked[0].explanation).toContain("Listing updated 40 days ago.");
  });

  it("weights the total and rounds half up to two decimals", () => {
    expect(round(99.625, 2)).toBe(99.63);
    expect(round(1.005, 2)).toBe(1.01);
    const r = recommend(input([room({ listing: listing({ distanceKm: 1.1, facilities: ["wifi"] }) })]));
    // 25*100 + 25*100 + 25*94.5 + 15*33.3 + 10*100 = 8862.0 -> 88.62
    expect(r.ranked[0].scores.facilities).toBe(33.3);
    expect(r.ranked[0].scores.total).toBe(88.62);
  });
});

describe("term conversion", () => {
  it(`divides term prices by ${TERM_MONTHS} and leaves monthly prices alone`, () => {
    expect(TERM_MONTHS).toBe(5);
    expect(monthlyPrice(4400, "term")).toBe(880);
    expect(monthlyPrice(1350, "month")).toBe(1350);
    expect(monthlyPrice(1350, null)).toBe(1350);
  });

  it("applies the budget ceiling to the monthly figure", () => {
    expect(recommend(input([room({ price: 10_000 })])).ranked).toHaveLength(1); // 2,000 a month
    expect(recommend(input([room({ price: 10_005 })])).excluded[0].reason).toBe("Above your budget (K2,001 a month)");
    const monthly = room({ price: 2_100, listing: listing({ rentUnit: "month" }) });
    expect(recommend(input([monthly])).excluded[0].reason).toBe("Above your budget (K2,100 a month)");
  });
});

// ---------------------------------------------------------------- ranking

describe("ranking", () => {
  it("orders by total, then room number numerically, then bed label", () => {
    const far = listing({ id: "far", distanceKm: 4 });
    const r = recommend(
      input([
        room({ id: "r10", number: "10", beds: [bed("b10", "B")] }),
        room({ id: "r9", number: "9", beds: [bed("b9", "C")] }),
        room({ id: "r2-far", number: "2", listing: far }),
        room({ id: "r9b", number: "9", beds: [bed("b9b", "A")] }),
      ]),
    );
    expect(r.ranked.map((x) => `${x.room.number}${x.bed.label}`)).toEqual(["9A", "9C", "10B", "2A"]);
    expect(r.ranked.map((x) => x.rank)).toEqual([1, 2, 3, 4]);
  });

  it("keeps the top five only", () => {
    const r = recommend(input(Array.from({ length: 9 }, () => room())));
    expect(r.ranked).toHaveLength(5);
    expect(r.candidates.filter((c) => !c.excluded)).toHaveLength(5);
  });

  it("caps excluded rooms at 300 but counts them all", () => {
    const r = recommend(input(Array.from({ length: 350 }, () => room({ gender: "male_only" }))));
    expect(r.excluded).toHaveLength(MAX_EXCLUDED);
    expect(r.failCounts.gender_policy).toBe(350);
    expect(r.explanation).toContain("Considered 350 rooms: 0 eligible, 0 ranked, 350 excluded.");
  });

  it("explains an empty result by reason", () => {
    const r = recommend(input([room({ gender: "male_only" }), room({ gender: "mixed" }), room({ type: "quad" })]));
    expect(r.ranked).toEqual([]);
    expect(r.explanation).toContain("No room passed the hard constraints. gender policy: 2 rooms, room type: 1 room.");
    const none = recommend(input([]));
    expect(none.candidates).toEqual([]);
    expect(none.explanation).toContain("There were no rooms to consider.");
  });
});

// ---------------------------------------------------------------- output shape and fairness

describe("candidate rows for record_recommendation", () => {
  it("have exactly the agreed keys, a bed for ranked rows and a reason for excluded rows", () => {
    const r = recommend(input([room(), room({ gender: "male_only" })]));
    const keys = [
      "bed_id",
      "excluded",
      "exclusion_reason",
      "explanation",
      "rank",
      "room_id",
      "score_availability",
      "score_budget",
      "score_distance",
      "score_facilities",
      "score_room_type",
      "score_total",
    ];
    for (const c of r.candidates) expect(Object.keys(c).sort()).toEqual(keys);
    const [ranked, excluded] = r.candidates;
    expect(ranked).toMatchObject({ excluded: false, rank: 1, exclusion_reason: null });
    expect(ranked.bed_id).toBeTruthy();
    expect(excluded).toMatchObject({ excluded: true, rank: null, bed_id: null, score_total: null, exclusion_reason: "Gender policy: male only" });
    // Survives JSON, as sent to the database.
    expect(JSON.parse(JSON.stringify(r.candidates))).toEqual(r.candidates);
  });
});

describe("fairness (PRD FR5.6)", () => {
  it("gives an identical result when personal details are added to the input", () => {
    const rooms = [room(), room({ listing: listing({ distanceKm: 2 }) }), room({ gender: "male_only" })];
    const plain = input(rooms);
    const withPersonal = {
      ...plain,
      application: {
        ...plain.application,
        fullName: "Demo Student",
        nationality: "Example",
        religion: "Example",
        studentNumber: "000-000",
        dateOfBirth: "2000-01-01",
        phone: "+260 000 000 000",
      },
    } as unknown as EngineInput;
    expect(recommend(withPersonal)).toEqual(recommend(plain));
  });
});
