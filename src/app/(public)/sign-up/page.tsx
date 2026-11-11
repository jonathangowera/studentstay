import type { Metadata } from "next";
import { AuthView } from "@/components/auth/AuthView";
import { signupRoleFromParam } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Create an account" };

/** /sign-up?role=owner pre-selects Owner (the "Register as a partner" link). Any other value means Student. */
export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { role } = await searchParams;
  return <AuthView next={null} createFirst signupRole={signupRoleFromParam(role)} />;
}
