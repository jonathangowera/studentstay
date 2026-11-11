import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export default function HomePage() {
  return (
    <div className="wrap main">
      <div className="auth" style={{ alignItems: "stretch" }}>
        <section className="card card-b stack">
          <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", lineHeight: 1.15, letterSpacing: "-.02em" }}>
            Find student housing near your campus in Lusaka
          </h1>
          <p className="muted">
            One account for university hostels and private rooms. This is a demonstration project: every name and
            listing is invented.
          </p>
          <div className="row">
            <Link className="btn primary" href="/sign-up">
              Create account
            </Link>
            <Link className="btn" href="/sign-in">
              Sign in
            </Link>
          </div>
        </section>
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
