import Link from "next/link";
import { Brand } from "./Brand";

export function PublicFooter() {
  return (
    <footer className="sf">
      <div className="wrap sf-in">
        <div>
          <Brand />
          <p style={{ marginTop: ".75rem", maxWidth: "34ch" }}>
            Student accommodation in Lusaka. Listings are checked before they appear. Checks are not a guarantee.
          </p>
        </div>
        <nav aria-labelledby="ft-students">
          <h2 id="ft-students">Students</h2>
          <ul>
            <li>
              <Link href="/listings">Find a home</Link>
            </li>
            <li>
              <Link href="/student/shortlist">Your shortlist</Link>
            </li>
            <li>
              <Link href="/compare">Compare places</Link>
            </li>
          </ul>
        </nav>
        <nav aria-labelledby="ft-partners">
          <h2 id="ft-partners">Partners</h2>
          <ul>
            <li>
              <Link href="/sign-up?role=owner">Register as a partner</Link>
            </li>
          </ul>
        </nav>
        <nav aria-labelledby="ft-support">
          <h2 id="ft-support">Support</h2>
          <ul>
            <li>
              <Link href="/help">Help and privacy</Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="wrap sf-b">
        <p>
          <b>Demonstration data. Payments are simulated.</b> No real transactions occur.
        </p>
      </div>
    </footer>
  );
}
