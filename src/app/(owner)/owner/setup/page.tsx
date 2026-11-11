import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPartner, requireRole } from "@/server/session";
import { BusinessForm } from "./BusinessForm";

export const metadata: Metadata = { title: "Set up your business" };

export default async function OwnerSetupPage() {
  const session = await requireRole("owner", "/owner/setup");
  if (await hasPartner(await createClient(), session.userId)) redirect("/owner");
  return (
    <div className="auth single" style={{ marginTop: 0 }}>
      <div className="pg-head" style={{ marginBottom: 0 }}>
        <h1>Set up your business</h1>
        <p>One short step before you add properties. You can change these details later.</p>
      </div>
      <BusinessForm />
    </div>
  );
}
