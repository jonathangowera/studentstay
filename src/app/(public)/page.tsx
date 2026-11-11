import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingImage } from "@/components/listings/ListingImage";
import { VerificationPill } from "@/components/listings/ListingBits";
import { ErrorNotice } from "@/components/ui/Callout";
import { reportError } from "@/lib/errors";
import { BUDGET_BANDS } from "@/lib/listings/filters";
import { ROOM_TYPES, ROOM_TYPE_LABEL, institutionShortName } from "@/lib/listings/labels";
import { featuredListings, institutions, listingAreas, type Institution, type ListingCardData } from "@/server/listings";
import { getViewer } from "@/server/viewer";
import { savedListingIds } from "@/server/listings";

async function load() {
  try {
    const [insts, areas, featured] = await Promise.all([institutions(), listingAreas(), featuredListings(4)]);
    return { insts, areas, featured, error: null };
  } catch (err) {
    unstable_rethrow(err);
    const f = reportError("load home page", err);
    return { insts: [] as Institution[], areas: [] as string[], featured: [] as ListingCardData[], error: f };
  }
}

export default async function HomePage() {
  const [{ insts, areas, featured, error }, viewer] = await Promise.all([load(), getViewer()]);
  const saved = await savedListingIds(viewer.studentId, featured.map((f) => f.id));

  return (
    <>
      <section className="hero" aria-labelledby="h-title">
        <div className="wrap hero-in">
          <div>
            <span className="kick">
              <Icon name="shield-check" />
              Listings checked before they go live
            </span>
            <h1 id="h-title">Find a place to stay near your campus</h1>
            <p className="lead">
              Browse student accommodation in Lusaka, see which beds are free, and apply to a university hostel or a
              private landlord in one place.
            </p>
            <form className="hsearch" action="/listings" method="get" role="search" aria-label="Search listings">
              <div className="field">
                <label htmlFor="hs-inst">Institution</label>
                <select id="hs-inst" name="institution" defaultValue="">
                  <option value="">Any institution</option>
                  {insts.map((i) => (
                    <option key={i.code} value={i.code}>
                      {institutionShortName(i.code, i.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="hs-area">Area</label>
                <select id="hs-area" name="area" defaultValue="">
                  <option value="">Anywhere in Lusaka</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="hs-budget">Budget per month</label>
                <select id="hs-budget" name="budget" defaultValue="">
                  <option value="">Any budget</option>
                  {BUDGET_BANDS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="hs-room">Room type</label>
                <select id="hs-room" name="room" defaultValue="">
                  <option value="">Any room</option>
                  {ROOM_TYPES.map((r) => (
                    <option key={r} value={r}>
                      {ROOM_TYPE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn primary" type="submit">
                <Icon name="search" />
                Search
              </button>
            </form>
            {insts.length ? (
              <ul className="qchips" aria-label="Places near an institution">
                <li aria-hidden="true">Near:</li>
                {insts
                  .filter((i) => i.status === "active")
                  .map((i) => (
                    <li key={i.code}>
                      <Link href={`/listings?institution=${i.code}`}>
                        <span className="sr-only">Places near </span>
                        {institutionShortName(i.code, i.name)}
                      </Link>
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
          <div className="hero-art">
            <ListingImage id="home-hero" alt="Illustration of a student residence" />
          </div>
        </div>
      </section>

      <div className="wrap">
        {error ? (
          <div style={{ marginTop: "1.5rem" }}>
            <ErrorNotice message="We could not load listings just now. Please try again." reference={error.reference} />
          </div>
        ) : null}

        <section className="psec" aria-labelledby="p-t">
          <div className="sec-h">
            <div>
              <h2 id="p-t">Two ways to get a bed</h2>
              <p>Pick the route that matches how you want to be housed. You can tell them apart on every listing and application.</p>
            </div>
          </div>
          <div className="paths">
            <article className="path">
              <span className="pi">
                <Icon name="cap" />
              </span>
              <span className="route">Route 1</span>
              <h3>University allocation</h3>
              <p className="muted">Your university accommodation office reviews your profile and allocates a bed using published rules.</p>
              <ul>
                <li>
                  <Icon name="check" />
                  Rooms are ranked using your room type, budget, distance and facilities preferences
                </li>
                <li>
                  <Icon name="check" />
                  You see the reasons behind a recommendation
                </li>
                <li>
                  <Icon name="check" />
                  An administrator approves every allocation. A recommendation is not a bed until then.
                </li>
              </ul>
              <Link className="btn primary" href="/listings?type=university_hostel">
                <span>Browse university hostels</span>
                <Icon name="arrow-r" />
              </Link>
            </article>
            <article className="path">
              <span className="pi">
                <Icon name="key" />
              </span>
              <span className="route">Route 2</span>
              <h3>Private rental application</h3>
              <p className="muted">Apply directly to a landlord or boarding house. The owner reviews your application and documents.</p>
              <ul>
                <li>
                  <Icon name="check" />
                  Choose the exact property and room type you want
                </li>
                <li>
                  <Icon name="check" />
                  Upload documents privately. Only reviewers can see them.
                </li>
                <li>
                  <Icon name="check" />
                  Track the owner&rsquo;s decision in your dashboard
                </li>
              </ul>
              <Link className="btn" href="/listings?type=private_rental&type=recognised_boarding_house">
                <span>Browse private rentals</span>
                <Icon name="arrow-r" />
              </Link>
            </article>
          </div>
        </section>

        <section className="psec" aria-labelledby="f-t" style={{ paddingTop: 0 }}>
          <div className="sec-h">
            <div>
              <h2 id="f-t">Available this intake</h2>
              <p>Recently updated listings with beds free today.</p>
            </div>
            <Link className="btn soft" href="/listings?free=1">
              <span>See all listings</span>
              <Icon name="arrow-r" />
            </Link>
          </div>
          {featured.length ? (
            <ul className="lcards">
              {featured.map((c) => (
                <li key={c.id}>
                  <ListingCard card={c} heart={viewer.heart} saved={saved.has(c.id)} returnTo="/" />
                </li>
              ))}
            </ul>
          ) : !error ? (
            <p className="muted">No places have free beds right now. Check again soon.</p>
          ) : null}
        </section>

        <section className="psec" aria-labelledby="hw-t" style={{ paddingTop: 0 }}>
          <div className="sec-h">
            <h2 id="hw-t">How it works</h2>
          </div>
          <ol className="how">
            <li>
              <b>Create an account</b>
              <p>Register with your institution email so your university applications can be matched to you.</p>
            </li>
            <li>
              <b>Search and compare</b>
              <p>Filter by distance, price and facilities. Shortlist and compare up to three places.</p>
            </li>
            <li>
              <b>Apply and follow the status</b>
              <p>Submit your application, upload documents if needed, and watch every step in your dashboard.</p>
            </li>
            <li>
              <b>Confirm your bed</b>
              <p>Once approved, pay the demonstration deposit and receive your booking confirmation.</p>
            </li>
          </ol>
        </section>

        <section className="psec trust" aria-label="Trust and verification" style={{ paddingTop: 0 }}>
          <div className="card card-b stack">
            <h2 style={{ fontSize: "1.25rem" }}>What &ldquo;verified listing information&rdquo; means</h2>
            <p className="muted">
              Each listing goes through moderation before it appears. For private rentals, owners submit documents that a
              reviewer checks for clarity, completeness and consistency.
            </p>
            <div className="row">
              <VerificationPill value="verified" />
              <span className="pill s-warn">
                <Icon name="info" />
                <span>Not a guarantee</span>
              </span>
            </div>
            <p className="muted">
              The badge shows that checks were completed. It does not certify the property in any way. Visit before you pay.
            </p>
          </div>
          <div className="card card-b stack">
            <h2 style={{ fontSize: "1.25rem" }}>Beds are updated by their owners</h2>
            <ul className="tlist">
              <li>
                <Icon name="clock" />
                <div>
                  <b>Update dates on every listing</b>
                  <p>Listings not updated for over 30 days are flagged.</p>
                </div>
              </li>
              <li>
                <Icon name="bed" />
                <div>
                  <b>Two applicants cannot get the same bed</b>
                  <p>Availability is re-checked when a booking is confirmed.</p>
                </div>
              </li>
              <li>
                <Icon name="lock" />
                <div>
                  <b>Your documents stay private</b>
                  <p>Identity and enrolment documents are never shown on public pages.</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {insts.length ? (
          <section className="psec" aria-labelledby="in-t" style={{ paddingTop: 0 }}>
            <div className="sec-h">
              <h2 id="in-t">Browse by institution</h2>
            </div>
            <ul className="inst-strip">
              {insts.map((i) => (
                <li key={i.code}>
                  <Link href={`/listings?institution=${i.code}`}>
                    <Icon name="cap" />
                    {institutionShortName(i.code, i.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="band" aria-labelledby="pt-t">
          <div>
            <h2 id="pt-t">Own or manage student housing?</h2>
            <p>Register as a partner to publish rooms, keep bed availability current and handle private applications.</p>
          </div>
          <Link className="btn primary" href="/sign-up">
            <Icon name="building" />
            Register as a partner
          </Link>
        </section>
      </div>
    </>
  );
}
