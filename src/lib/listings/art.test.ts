import { describe, expect, it } from "vitest";
import { buildingArt, hashSeed } from "./art";

describe("placeholder illustration", () => {
  it("is the same for the same listing id", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(buildingArt(id)).toEqual(buildingArt(id));
  });

  it("varies between listings", () => {
    const pictures = new Set(
      ["a", "b", "c", "d", "e", "f"].map((s) => JSON.stringify(buildingArt(`${s}-listing`))),
    );
    expect(pictures.size).toBeGreaterThan(4);
  });

  it("keeps every shape inside the 400 by 240 picture", () => {
    for (let i = 0; i < 50; i++) {
      const art = buildingArt(`seed-${i}`);
      for (const b of art.blocks) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(400);
        expect(b.y).toBeGreaterThan(0);
        for (const w of b.windows) expect(w.y + w.h).toBeLessThanOrEqual(196 - 20);
      }
    }
  });

  it("hashes strings to unsigned 32-bit numbers", () => {
    expect(hashSeed("")).toBe(0x811c9dc5);
    expect(hashSeed("abc")).toBeGreaterThan(0);
  });
});
