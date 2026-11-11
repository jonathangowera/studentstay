import type { Metadata } from "next";
import { ProfileView } from "@/components/profile/ProfileView";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await requireRole("owner", "/owner/profile");
  return <ProfileView session={session} />;
}
