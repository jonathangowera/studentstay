/**
 * Every new page refuses the wrong role before it reads any data. The real requireRole runs against a fake
 * Supabase client; a refusal is Next's redirect to /no-access (or to sign in when signed out).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, redirectTarget } from "@/test/fake-supabase";
import { ROLES, type Role } from "@/lib/auth/roles";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const current: { client: unknown } = { client: null };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => current.client }));

import OwnerHome from "./(owner)/owner/page";
import OwnerApplications from "./(owner)/owner/applications/page";
import OwnerApplication from "./(owner)/owner/applications/[reference]/page";
import TechnicianHome from "./(technician)/technician/page";
import TechnicianTicket from "./(technician)/technician/tickets/[reference]/page";
import SystemHome from "./(system)/system/page";
import StudentRepairs from "./(student)/student/repairs/page";

type AnyPage = (props: { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string>> }) => Promise<unknown>;

const PAGES: { name: string; role: Role; page: AnyPage; params: Record<string, string> }[] = [
  { name: "/owner", role: "owner", page: OwnerHome as unknown as AnyPage, params: {} },
  { name: "/owner/applications", role: "owner", page: OwnerApplications as unknown as AnyPage, params: {} },
  { name: "/owner/applications/[reference]", role: "owner", page: OwnerApplication as unknown as AnyPage, params: { reference: "APP-2026-0420" } },
  { name: "/technician", role: "technician", page: TechnicianHome as unknown as AnyPage, params: {} },
  { name: "/technician/tickets/[reference]", role: "technician", page: TechnicianTicket as unknown as AnyPage, params: { reference: "TKT-1101" } },
  { name: "/system", role: "system_admin", page: SystemHome as unknown as AnyPage, params: {} },
  { name: "/student/repairs", role: "student", page: StudentRepairs as unknown as AnyPage, params: {} },
];

const props = (params: Record<string, string>) => ({ params: Promise.resolve(params), searchParams: Promise.resolve({}) });

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

describe.each(PAGES)("$name", ({ role, page, params }) => {
  it.each(ROLES.filter((r) => r !== role))("refuses a %s before reading any data", async (other) => {
    const fake = fakeSupabase(other);
    current.client = fake.client;
    const err = await page(props(params)).catch((e) => e);
    expect(redirectTarget(err)).toBe("/no-access");
    expect(fake.dataCalls()).toEqual([]);
  });

  it("sends a signed-out visitor to sign in", async () => {
    const fake = fakeSupabase(null);
    current.client = fake.client;
    const err = await page(props(params)).catch((e) => e);
    expect(redirectTarget(err)).toMatch(/^\/sign-in\?next=/);
    expect(fake.dataCalls()).toEqual([]);
  });
});
