import type { Metadata } from "next";
import Link from "next/link";
import { Home, flag } from "@/components/shell/Home";
import { StudentNumberPill } from "@/components/profile/StudentNumberPill";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Home" };

export default async function StudentHome(props: PageProps<"/student">) {
  const session = await requireRole("student", "/student");
  const params = await props.searchParams;
  const p = session.profile;

  let institution: string | null = null;
  if (p.institution_id) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("institutions").select("name").eq("id", p.institution_id).maybeSingle();
    if (error) reportError("load institution", error);
    institution = data?.name ?? null;
  }

  return (
    <Home
      name={p.full_name}
      subtitle="Demonstration data. Your applications and payments will appear here in a later release."
      passwordUpdated={flag(params.password)}
      links={[
        { href: "/listings", title: "Find a home", text: "Search places near your campus", icon: "search" },
        { href: "/student/shortlist", title: "Shortlist", text: "Places you saved", icon: "heart" },
        { href: "/student/profile", title: "Profile", text: "Your details, institution and preferences", icon: "user" },
      ]}
    >
      <section className="card" aria-labelledby="sn-h">
        <div className="card-h">
          <h2 id="sn-h">Your student details</h2>
          <StudentNumberPill number={p.student_number} matched={p.student_number_matched} />
        </div>
        <div className="card-b">
          <dl className="facts">
            <dt>Institution</dt>
            <dd>{institution ?? "Not chosen yet"}</dd>
            <dt>Student number</dt>
            <dd>{p.student_number ?? "Not added yet"}</dd>
          </dl>
          {!p.student_number || !p.institution_id ? (
            <p style={{ marginTop: ".8rem" }}>
              <Link href="/student/profile">Add your institution and student number</Link> so your accommodation office
              can confirm them.
            </p>
          ) : null}
        </div>
      </section>
    </Home>
  );
}
