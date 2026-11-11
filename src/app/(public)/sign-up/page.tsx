import type { Metadata } from "next";
import { AuthView } from "@/components/auth/AuthView";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return <AuthView next={null} createFirst />;
}
