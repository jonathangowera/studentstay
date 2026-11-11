import { describe, expect, it } from "vitest";
import { floorLabel, summariseRoomTypes, type RoomInput } from "./rooms";

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
