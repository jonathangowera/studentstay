import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { reportError } from "@/lib/errors";
import { ErrorNotice } from "@/components/ui/Callout";
import type { Session } from "@/server/session";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ProfileForm, type InstitutionOption } from "./ProfileForm";

/** Profile page body for every role. Loads the institution list for students only. */
export async function ProfileView({ session }: { session: Session }) {
  let institutions: InstitutionOption[] = [];
  let loadError: { message: string; reference: string } | null = null;

  if (session.role === "student") {
    const supabase = await createClient();
    const { data, error } = await supabase.from("institutions").select("id, name, status").order("name");
    if (error) loadError = reportError("load institutions", error);
    else institutions = data.map((i) => ({ id: i.id, name: i.name, pending: i.status === "validation_pending" }));
  }

  const p = session.profile;
  return (
    <>
      <div className="pg-head">
        <h1>Profile</h1>
        <p>
          {session.role === "student"
            ? "Keep your details up to date so your applications are matched correctly."
            : `Your details as a ${ROLE_LABEL[session.role].toLowerCase()}.`}
        </p>
      </div>
      {loadError ? (
        <div style={{ marginBottom: "1rem" }}>
          <ErrorNotice message="We could not load the list of institutions. Please try again." reference={loadError.reference} />
        </div>
      ) : null}
      <ProfileForm
        role={session.role}
        email={session.email}
        institutions={institutions}
        profile={{
          full_name: p.full_name,
          phone: p.phone,
          emergency_contact: p.emergency_contact,
          institution_id: p.institution_id,
          student_number: p.student_number,
          student_number_matched: p.student_number_matched,
          programme: p.programme,
          study_year: p.study_year,
          preferred_room_type: p.preferred_room_type,
          budget_zmw: p.budget_zmw,
          preferred_facilities: p.preferred_facilities,
          notify_sms: p.notify_sms,
          owner_can_see_profile: p.owner_can_see_profile,
        }}
      />
      <div className="split" style={{ marginTop: "var(--gap)" }}>
        <ChangePasswordForm />
      </div>
    </>
  );
}
