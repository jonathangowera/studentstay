import { describe, expect, it } from "vitest";
import { floorLabel, roomTypeRangesByListing, summariseRoomTypes, type RoomInput } from "./rooms";

const room = (type: RoomInput["room_type"], price: number, states: RoomInput["beds"][number]["state"][], floor: number | null = 1, wing: string | null = null): RoomInput => ({
  room_type: type,
  price_zmw: price,
  floor,
  wing,
  beds: states.map((state) => ({ state })),
});

describe("summariseRoomTypes", () => {
  it("groups rooms by type in the usual order and counts beds", () => {
    const s = summariseRoomTypes([
      room("double", 1900, ["available", "occupied"]),
      room("single", 2400, ["available"]),
      room("double", 2000, ["held", "reserved"]),
    ]);
    expect(s.map((x) => x.type)).toEqual(["single", "double"]);
    expect(s[1]).toMatchObject({ rooms: 2, bedsTotal: 4, free: 1, setAside: 1, priceFrom: 1900, priceTo: 2000 });
  });

  it("says when held beds may come back", () => {
    const [quad] = summariseRoomTypes([room("quad", 1350, ["held", "pending_approval", "occupied", "occupied"], 2)]);
    expect(quad.free).toBe(0);
    expect(quad.note).toBe("Floor 2. Held beds may return if a hold ends");
  });

  it("says when every bed is taken", () => {
    const [single] = summariseRoomTypes([room("single", 2400, ["occupied"], null)]);
    expect(single.note).toBe("All beds are taken");
  });

  it("describes floors and wings in plain words", () => {
    const [d] = summariseRoomTypes([
      room("double", 1900, ["available", "available"], 0, "Women's wing"),
      room("double", 1900, ["available", "available"], 1, "Men's wing"),
    ]);
    expect(d.note).toBe("Floors ground and 1, Men's wing and Women's wing");
    expect(floorLabel(0)).toBe("Ground floor");
  });

  it("returns nothing for a listing without rooms", () => {
    expect(summariseRoomTypes([])).toEqual([]);
  });
});

describe("roomTypeRangesByListing", () => {
  it("lists room types single, double, triple, quad whatever order the rows arrive in", () => {
    const out = roomTypeRangesByListing([
      { listing_id: "a", room_type: "quad", price_zmw: 800, beds: [] },
      { listing_id: "a", room_type: "single", price_zmw: "1700.00", beds: [{ state: "occupied" }] },
      { listing_id: "a", room_type: "triple", price_zmw: 1000, beds: [{ state: "available" }, { state: "available" }] },
      { listing_id: "a", room_type: "double", price_zmw: 1350, beds: [{ state: "available" }] },
      { listing_id: "a", room_type: "double", price_zmw: 1500, beds: [{ state: "held" }, { state: "available" }] },
      { listing_id: "b", room_type: "triple", price_zmw: 900, beds: null },
      { listing_id: "b", room_type: "double", price_zmw: 1200, beds: [] },
    ]);
    expect(out.get("a")!.map((r) => r.type)).toEqual(["single", "double", "triple", "quad"]);
    expect(out.get("b")!.map((r) => r.type)).toEqual(["double", "triple"]);
    expect(out.get("a")![1]).toEqual({ type: "double", from: 1350, to: 1500, free: 2 });
    expect(out.get("a")![0]).toEqual({ type: "single", from: 1700, to: 1700, free: 0 });
  });

  it("orders the details and availability summary the same way", () => {
    const room = (room_type: RoomInput["room_type"]): RoomInput => ({ room_type, price_zmw: 1000, wing: null, floor: null, beds: [] });
    expect(summariseRoomTypes([room("triple"), room("quad"), room("single"), room("double")]).map((t) => t.type)).toEqual([
      "single",
      "double",
      "triple",
      "quad",
    ]);
  });
});
