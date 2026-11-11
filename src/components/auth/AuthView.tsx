import { Icon } from "@/components/ui/Icon";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";

/** Sign in and create account side by side, as in the design file. */
export function AuthView({
  next,
  notice,
  createFirst = false,
}: {
  next: string | null;
  notice?: React.ReactNode;
  createFirst?: boolean;
}) {
  const signIn = <SignInForm key="in" next={next} />;
  const signUp = <SignUpForm key="up" />;
  return (
    <div className="wrap main">
      <h1 className="sr-only">{createFirst ? "Create an account" : "Sign in"}</h1>
      {notice ? <div style={{ maxWidth: "60rem", margin: "0 auto" }}>{notice}</div> : null}
      <div className="auth">{createFirst ? [signUp, signIn] : [signIn, signUp]}</div>
      <div className="auth single" style={{ maxWidth: "60rem", marginTop: 0 }}>
        <div className="auth-side">
          <h2>One account for your whole stay</h2>
          <ul>
            <li>
              <Icon name="check-c" />
              <span>Apply to a university hostel or private landlord</span>
            </li>
            <li>
              <Icon name="check-c" />
              <span>Follow every decision and payment in one place</span>
            </li>
            <li>
              <Icon name="check-c" />
              <span>Report a repair and watch it get fixed</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
