import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/** Every source file under src, as a path relative to src with forward slashes. */
function sourceFiles(dir: string, base = dir): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(full, base);
    return /\.(ts|tsx)$/.test(e.name) ? [path.relative(base, full).split(path.sep).join("/")] : [];
  });
}

const SRC = path.resolve(__dirname, "..");

describe("the service-role client", () => {
  const files = sourceFiles(SRC);

  it("is imported only under src/server/allocation/", () => {
    const users = files.filter((f) => {
      if (f === "server/supabase-admin.ts" || f.endsWith(".test.ts")) return false;
      return /supabase-admin/.test(fs.readFileSync(path.join(SRC, f), "utf8"));
    });
    expect(users.length).toBeGreaterThan(0);
    for (const f of users) expect(f.startsWith("server/allocation/")).toBe(true);
  });

  it("is server-only and its key never appears outside it with a public prefix", () => {
    expect(fs.readFileSync(path.join(SRC, "server/supabase-admin.ts"), "utf8")).toMatch(/^import "server-only";/);
    for (const f of files.filter((x) => !x.endsWith(".test.ts"))) {
      const text = fs.readFileSync(path.join(SRC, f), "utf8");
      expect(text).not.toMatch(/NEXT_PUBLIC_SUPABASE_SERVICE/);
      if (f !== "server/supabase-admin.ts") expect(text).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    }
  });
});
