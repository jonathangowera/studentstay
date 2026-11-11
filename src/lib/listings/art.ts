/**
 * Placeholder building illustration, used until real listing photos exist.
 * The same seed (a listing id) always gives the same picture, so a listing looks the same everywhere.
 * Shapes follow the design file's art-1 to art-8: sky, sun, ground, two blocks with windows, a door each, trees.
 */

export type Rect = { x: number; y: number; w: number; h: number };
export type Block = Rect & { fill: "b1" | "b2" | "b3"; windows: (Rect & { lit: boolean })[]; door: Rect };
export type BuildingArt = {
  sun: { cx: number; cy: number; r: number };
  blocks: Block[];
  trees: { cx: number; r: number }[];
};

/** FNV-1a 32-bit hash of a string. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small deterministic random number generator (mulberry32). */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GROUND = 196;

function block(r: () => number, x: number, w: number, fill: Block["fill"]): Block {
  const floors = 2 + Math.floor(r() * 3); // 2 to 4 floors of windows
  const h = 30 * floors + 34;
  const y = GROUND - h;
  const cols = 3 + Math.floor(r() * 2); // 3 or 4 windows across
  const gap = 12;
  const ww = Math.max(12, Math.floor((w - gap * (cols + 1)) / cols));
  const windows: Block["windows"] = [];
  for (let row = 0; row < floors; row++) {
    for (let c = 0; c < cols; c++) {
      windows.push({ x: x + gap + c * (ww + gap), y: y + 22 + row * 30, w: ww, h: 16, lit: r() > 0.35 });
    }
  }
  const door = { x: Math.round(x + w / 2 - 9), y: GROUND - 20, w: 18, h: 20 };
  return { x, y, w, h, fill, windows, door };
}

export function buildingArt(seed: string): BuildingArt {
  const r = rng(hashSeed(seed));
  const sunLeft = r() < 0.5;
  const sun = { cx: sunLeft ? 60 + Math.floor(r() * 40) : 310 + Math.floor(r() * 50), cy: 40 + Math.floor(r() * 25), r: 18 + Math.floor(r() * 9) };

  const x1 = 22 + Math.floor(r() * 32);
  const w1 = 110 + Math.floor(r() * 40);
  const x2 = x1 + w1 + 12 + Math.floor(r() * 14);
  const w2 = Math.min(140, 372 - x2);
  const blocks = [block(r, x1, w1, "b1"), block(r, x2, w2, r() < 0.5 ? "b2" : "b3")];

  const trees = [
    { cx: 6 + Math.floor(r() * 16), r: 14 + Math.floor(r() * 6) },
    { cx: 366 + Math.floor(r() * 20), r: 14 + Math.floor(r() * 5) },
  ];
  return { sun, blocks, trees };
}
