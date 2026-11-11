import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/Callout";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Help and privacy" };

const FAQ = [
  {
    q: "Is a recommendation the same as an allocation?",
    a: "No. A recommendation is a suggestion from the system. An administrator reviews it and decides. You only have a bed once the administrator approves it. You see the reasons behind every recommendation.",
  },
  {
    q: "What does “verified listing information” mean?",
    a: "A reviewer completed checks on the listing details and the owner’s documents. It is not a guarantee about the property. Visit before you pay.",
  },
  {
    q: "Are payments real?",
    a: "No. In this version every payment is a demonstration. No real money moves, and you never enter card, bank or mobile money details.",
  },
  {
    q: "Who can see my documents?",
    a: "Only reviewers with permission for your application. Documents are kept in private storage and are never shown on public pages.",
  },
  {
    q: "What if a bed I want is taken?",
    a: "Availability is checked again when your booking is confirmed. Two people can never get the same bed. If it is gone, you will be told and can choose another place.",
  },
];

export default function HelpPage() {
  return (
    <div className="wrap main">
      <div className="pg-head">
        <h1>Help and privacy</h1>
        <p>Answers to common questions. This page also sums up how your data is handled.</p>
      </div>
      <div className="split">
        <section className="card" aria-labelledby="faq-h">
          <div className="card-h">
            <h2 id="faq-h">Frequently asked questions</h2>
          </div>
          <div className="card-b" style={{ paddingTop: ".25rem" }}>
            {FAQ.map((item) => (
              <details className="faq" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="card" aria-labelledby="data-h">
          <div className="card-h">
            <h2 id="data-h">How we handle your data</h2>
          </div>
          <div className="card-b stack">
            <ul className="tlist" style={{ fontSize: ".9rem" }}>
              <li>
                <Icon name="check-c" />
                <span>We collect only what is needed to process your application.</span>
              </li>
              <li>
                <Icon name="check-c" />
                <span>Who can see your details depends on their role. Owners see only limited applicant details.</span>
              </li>
              <li>
                <Icon name="check-c" />
                <span>Identity and enrolment documents are kept private and opened only through short-lived links.</span>
              </li>
              <li>
                <Icon name="check-c" />
                <span>Every look at a private document is recorded in an audit log.</span>
              </li>
              <li>
                <Icon name="check-c" />
                <span>Your rights follow the Data Protection Act, 2021 of Zambia.</span>
              </li>
            </ul>
            <Callout tone="warn" title="Retention periods are still to be decided.">
              How long documents and records are kept, and who to contact about your data, will be set by the institution
              before real data is used.
            </Callout>
            <p className="muted" style={{ fontSize: ".8125rem" }}>
              This is a demonstration project. Every name and listing is invented.
            </p>
          </div>
        </section>
      </div>
      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/listings">Find a place to stay</Link>
      </p>
    </div>
  );
}
