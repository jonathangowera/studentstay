import type { Metadata } from "next";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ApplyWizard, type WizardPlace, type WizardValues } from "@/components/applications/ApplyWizard";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROLE_HOME, ROLE_LABEL, signInUrlFor } from "@/lib/auth/roles";
import { reportError } from "@/lib/errors";
import { isApplicationReference, openApplicationTo, universityStartDecision } from "@/lib/applications/rules";
import { STATUS_LABEL, isEditable, missingFromReason } from "@/lib/applications/status";
import { isUuid } from "@/lib/listings/compare";
import { ROOM_TYPES, type RoomType } from "@/lib/listings/labels";
import { createClient } from "@/lib/supabase/server";
import {
  allInstitutions,
  applicationByReference,
  emailVerified,
  myApplications,
  placeForApply,
  type Institution,
  type MyApplication,
  type PlaceForApply,
} from "@/server/applications";
import { getSession, type Session } from "@/server/session";

export const metadata: Metadata = { title: "Apply" };

function Frame({ crumb, children }: { crumb?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <div className="wrap main">
      <div className="pg-head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <ol>
            {crumb ? (
              <li>
                <Link href={crumb.href}>{crumb.label}</Link>
              </li>
            ) : (
              <li>
                <Link href="/listings">Listings</Link>
              </li>
            )}
            <li aria-current="page">Apply</li>
          </ol>
        </nav>
        <h1>Apply for accommodation</h1>
      </div>
      {children}
    </div>
  );
}

function Stop({ title, children, actions }: { title: string; children?: React.ReactNode; actions: React.ReactNode }) {
  return (
    <div className="card" style={{ maxWidth: "40rem", margin: "0 auto" }}>
      <EmptyState as="h2" icon="file" title={title}>
        {children}
      </EmptyState>
      <div className="row" style={{ justifyContent: "center", paddingBottom: "2rem" }}>
        {actions}
      </div>
    </div>
  );
}

function toWizardPlace(p: PlaceForApply): WizardPlace {
  return { id: p.id, name: p.name, area: p.area, gender: p.gender, rent_unit: p.rentUnit, rooms: p.rooms, isHostel: p.type === "university_hostel" };
}

function initialValues(session: Session, activeIds: string[], app?: MyApplication): WizardValues {
  const p = session.profile;
  const room = (app?.requested_room_type ?? p.preferred_room_type ?? "") as RoomType | "";
  const budget = app?.budget_zmw ?? (p.budget_zmw === null ? null : Number(p.budget_zmw));
  return {
    institution_id: p.institution_id && activeIds.includes(p.institution_id) ? p.institution_id : "",
    student_number: p.student_number ?? "",
    requested_room_type: ROOM_TYPES.includes(room as RoomType) ? room : "",
    budget_zmw: budget === null ? "" : String(Math.round(budget)),
    gender_needed: app?.gender_needed ?? "",
    intake: app?.intake ?? "",
    preferred_facilities: app?.preferred_facilities ?? p.preferred_facilities ?? [],
  };
}

export default async function ApplyPage({ searchParams }: PageProps<"/apply">) {
  const sp = await searchParams;
  const listingId = typeof sp.listing === "string" && isUuid(sp.listing) ? sp.listing : null;
  const editRef = typeof sp.application === "string" && isApplicationReference(sp.application) ? sp.application : null;
  const here = editRef ? `/apply?application=${editRef}` : listingId ? `/apply?listing=${listingId}` : "/apply";

  const session = await getSession();
  if (!session) redirect(signInUrlFor(here));

  if (session.role !== "student") {
    return (
      <Frame>
        <Stop title="Only student accounts can apply" actions={<Link className="btn primary" href={ROLE_HOME[session.role]}>Go to your home</Link>}>
          You are signed in as {ROLE_LABEL[session.role].toLowerCase()}. Applications are made by students from their own
          account.
        </Stop>
      </Frame>
    );
  }

  const supabase = await createClient();
  let data: {
    verified: boolean;
    insts: Institution[];
    apps: MyApplication[];
    place: PlaceForApply | null;
    editing: MyApplication | null;
  };
  try {
    const [verified, insts, apps] = await Promise.all([emailVerified(supabase), allInstitutions(supabase), myApplications(supabase, session.userId)]);
    const editing = editRef ? await applicationByReference(supabase, session.userId, editRef) : null;
    const placeId = editing?.listing_id ?? listingId;
    const place = placeId ? await placeForApply(supabase, placeId) : null;
    data = { verified, insts, apps, place, editing };
  } catch (err) {
    unstable_rethrow(err);
    const f = reportError("load apply page", err);
    return (
      <Frame>
        <ErrorNotice message="We could not load the application form just now. Please try again." reference={f.reference} />
      </Frame>
    );
  }

  const { verified, insts, apps, place, editing } = data;
  const crumb = place ? { href: `/listings/${place.id}`, label: place.name } : undefined;

  if (!verified) {
    return (
      <Frame crumb={crumb}>
        <Stop title="Verify your email before applying" actions={<Link className="btn" href="/student">Go to your home</Link>}>
          We sent you a link when you created your account. Open it, then come back to this page. Your email has not
          been verified yet, so the form is not shown.
        </Stop>
      </Frame>
    );
  }

  const active = insts.filter((i) => i.status === "active");
  const activeIds = active.map((i) => i.id);
  const closedNames = insts.filter((i) => i.status !== "active").map((i) => i.name);
  const profile = {
    institution_id: session.profile.institution_id,
    student_number: session.profile.student_number,
    confirmed: session.profile.student_number_matched,
  };

  // ------------------------------------------------------------ editing a draft or profile incomplete application
  if (editRef) {
    if (!editing) {
      return (
        <Frame>
          <Stop title="We could not find that application" actions={<Link className="btn primary" href="/student/applications">See your applications</Link>} />
        </Frame>
      );
    }
    if (!isEditable(editing.status)) {
      return (
        <Frame crumb={crumb}>
          <Stop
            title="This application can no longer be edited"
            actions={<Link className="btn primary" href={`/student/applications/${editing.reference}`}>View your application</Link>}
          >
            Its status is {STATUS_LABEL[editing.status]}.
          </Stop>
        </Frame>
      );
    }
    const missing = editing.status === "profile_incomplete" ? missingFromReason(editing.status_reason) : [];
    return (
      <Frame crumb={crumb}>
        <p className="muted" style={{ marginTop: "-.75rem", marginBottom: "1rem" }}>
          Continue application <span className="ref">{editing.reference}</span>
        </p>
        {missing.length ? (
          <div style={{ marginBottom: "1rem" }}>
            <Callout tone="warn" title="Some details are missing">
              {missing.map((m) => m.label).join(", ")}.{" "}
              {missing.some((m) => m.fixIn === "profile") ? (
                <>
                  <Link href="/student/profile">Add {missing.filter((m) => m.fixIn === "profile").map((m) => m.label.toLowerCase()).join(" and ")} in your profile</Link>
                  , then come back and submit again.
                </>
              ) : (
                "Fill them in below, then submit again."
              )}
            </Callout>
          </div>
        ) : null}
        <ApplyWizard
          mode="edit"
          reference={editing.reference}
          fixedRoute={editing.route}
          fixedInstitutionName={editing.institution_id ? (insts.find((i) => i.id === editing.institution_id)?.name ?? null) : null}
          place={place ? toWizardPlace(place) : null}
          institutions={active}
          closedInstitutionNames={closedNames}
          profile={profile}
          initial={initialValues(session, activeIds, editing)}
        />
      </Frame>
    );
  }

  // ------------------------------------------------------------ a new application
  if (listingId && !place) {
    return (
      <Frame>
        <Stop title="This place is not open for applications" actions={<Link className="btn primary" href="/listings">Find a home</Link>}>
          It may have been removed, or it is not published yet.
        </Stop>
      </Frame>
    );
  }

  if (place) {
    const open = openApplicationTo(apps, place.id);
    if (open) {
      return (
        <Frame crumb={crumb}>
          <Stop
            title="You have applied to this place"
            actions={<Link className="btn primary" href={`/student/applications/${open.reference}`}>View your application</Link>}
          >
            You already have an open application to {place.name} ({STATUS_LABEL[open.status]}).
          </Stop>
        </Frame>
      );
    }
  }

  const uniDecision = universityStartDecision(apps);
  const privateOffered = !!place && place.type !== "university_hostel";
  if (uniDecision.kind !== "new" && !privateOffered) {
    return (
      <Frame crumb={crumb}>
        {uniDecision.kind === "continue" ? (
          <Stop
            title="You have a university allocation application that is not finished yet"
            actions={<Link className="btn primary" href={`/apply?application=${uniDecision.app.reference}`}>Continue your application</Link>}
          >
            Application {uniDecision.app.reference} is {STATUS_LABEL[uniDecision.app.status].toLowerCase()}. Finish that one
            instead of starting another.
          </Stop>
        ) : (
          <Stop
            title="You already have an open university allocation application"
            actions={
              <>
                <Link className="btn primary" href={`/student/applications/${uniDecision.app.reference}`}>View your application</Link>
                <Link className="btn" href="/listings?type=recognised_boarding_house&type=private_rental">Browse private rentals</Link>
              </>
            }
          >
            You can have one university allocation application at a time. You can still apply to private rentals.
          </Stop>
        )}
      </Frame>
    );
  }

  return (
    <Frame crumb={crumb}>
      {uniDecision.kind !== "new" ? (
        <div style={{ marginBottom: "1rem" }}>
          <Callout tone="info" title="You already have a university allocation application">
            <Link href={uniDecision.kind === "continue" ? `/apply?application=${uniDecision.app.reference}` : `/student/applications/${uniDecision.app.reference}`}>
              {uniDecision.kind === "continue" ? "Continue that application" : "View that application"}
            </Link>
            . You can still apply privately to {place?.name}.
          </Callout>
        </div>
      ) : null}
      <ApplyWizard
        mode="new"
        place={place ? toWizardPlace(place) : null}
        institutions={active}
        closedInstitutionNames={closedNames}
        profile={profile}
        initial={initialValues(session, activeIds)}
      />
    </Frame>
  );
}
