import type { Metadata } from "next";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="wrap main">
      <div className="auth single">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
