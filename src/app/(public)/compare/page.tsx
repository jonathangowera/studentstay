import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListingImage } from "@/components/listings/ListingImage";
import { BedsPill, FacilityList, StaleNote, Updated, VerificationPill } from "@/components/listings/ListingBits";
import { reportError, type FriendlyError } from "@/lib/errors";
import { formatKm, priceRange } from "@/lib/format";
import { MAX_COMPARE, compareHref, lowestPriceIds, nearestIds, parseCompareIds } from "@/lib/listings/compare";
import { GENDER_LABEL, ROOM_TYPE_LABEL, distanceEntries, institutionShortName } from "@/lib/listings/labels";
import type { RoomTypeRange } from "@/lib/listings/rooms";
import { cardsByIds, institutions, roomTypesFor, type Institution, type ListingCardData } from "@/server/listings";

export const metadata: Metadata = { title: "Compare places" };

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const sp = await searchParams;
  const { ids, tooMany, invalid } = parseCompareIds(sp.ids);
  const instParam = typeof sp.institution === "string" ? sp.institution.toUpperCase() : null;

  let rows: ListingCardData[] = [];
  let insts: Institution[] = [];
  let roomTypes = new Map<string, RoomTypeRange[]>();
  let error: FriendlyError | null = null;
  try {
    const [cards, i, rt] = await Promise.all([cardsByIds(ids), institutions(), roomTypesFor(ids)]);
    rows = ids.map((id) => cards.find((c) => c.id === id)).filter((c): c is ListingCardData => !!c);
    insts = i;
    roomTypes = rt;
  } catch (err) {
    unstable_rethrow(err);
    error = reportError("load compare", err);
  }

  const institution = instParam && insts.some((i) => i.code === instParam) ? instParam : null;
  const instLabel = institution ? institutionShortName(institution, insts.find((i) => i.code === institution)?.name) : null;
  const missing = ids.length - rows.length;
  const kmFor = (r: ListingCardData) => {
    if (!institution) return null;
    return distanceEntries(r.distances).find((d) => d.code === institution)?.km ?? null;
  };
  const cheapest = new Set(lowestPriceIds(rows.map((r) => ({ id: r.id, price_from: r.price_from }))));
  const nearest = new Set(nearestIds(rows.map((r) => ({ id: r.id, km: kmFor(r) }))));

  return (
    <div className="wrap main">
      <div className="pg-head">
        <h1>Compare places</h1>
        <p>Up to {MAX_COMPARE} places side by side. Tick Compare on the listings page to choose them.</p>
      </div>

      <div className="stack">
        {tooMany ? (
          <Callout tone="warn" title={`You can compare up to ${MAX_COMPARE} places.`} role="status">
            We are showing the first {MAX_COMPARE}. Remove one to add another.
          </Callout>
        ) : null}
        {invalid || missing > 0 ? (
          <Callout tone="info" title="Some places were left out." role="status">
            {missing > 0 ? `${missing === 1 ? "One place is" : `${missing} places are`} no longer listed. ` : ""}
            {invalid ? "Part of the link was not a place we recognise." : ""}
          </Callout>
        ) : null}
        {error ? <ErrorNotice message="We could not load these places just now. Please try again." reference={error.reference} /> : null}

        {!error && rows.length === 0 ? (
          <div className="card">
            <EmptyState icon="scale" title="Nothing to compare yet.">
              Tick Compare on up to {MAX_COMPARE} places on the listings page, then press Compare now.
            </EmptyState>
            <div className="row" style={{ justifyContent: "center", paddingBottom: "2rem" }}>
              <Link className="btn primary" href="/listings">
                Find a place
              </Link>
            </div>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <>
            <form className="card card-b row" action="/compare" method="get" style={{ alignItems: "flex-end" }}>
              <input type="hidden" name="ids" value={rows.map((r) => r.id).join(",")} />
              <div className="field" style={{ minWidth: "14rem" }}>
                <label htmlFor="cmp-inst">Distance to</label>
                <select id="cmp-inst" name="institution" defaultValue={institution ?? ""}>
                  <option value="">Choose an institution</option>
                  {insts.map((i) => (
                    <option key={i.code} value={i.code}>
                      {institutionShortName(i.code, i.name)}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn" type="submit">
                Show distances
              </button>
              {rows.length === 1 ? (
                <p className="muted" style={{ fontSize: ".875rem" }}>
                  Add another place to compare. <Link href="/listings">Find a place</Link>
                </p>
              ) : null}
            </form>

            <div className="card">
              <div className="tbl-wrap">
                <table className="tbl cmp-tbl">
                  <caption className="sr-only">Comparison of {rows.length} places</caption>
                  <thead>
                    <tr>
                      <td />
                      {rows.map((r) => (
                        <th scope="col" key={r.id}>
                          <div className="art-s">
                            <ListingImage id={r.id} alt="" />
                          </div>
                          <Link href={`/listings/${r.id}`} style={{ color: "var(--ink)" }}>
                            {r.name}
                          </Link>
                          <span className="muted" style={{ display: "block", fontSize: ".8125rem", fontWeight: 400 }}>
                            {r.area}, Lusaka
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Price</th>
                      {rows.map((r) => (
                        <td key={r.id}>
                          {priceRange(r.price_from, r.price_to, r.rent_unit)}
                          {cheapest.has(r.id) ? (
                            <span className="best">
                              <StatusPill tone="ok" icon="check-c" label="Lowest price" />
                            </span>
                          ) : null}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">{instLabel ? `Distance to ${instLabel}` : "Distance"}</th>
                      {rows.map((r) => {
                        const km = kmFor(r);
                        return (
                          <td key={r.id}>
                            {!institution ? (
                              <span className="muted">Choose an institution above</span>
                            ) : km === null ? (
                              <span className="muted">Not listed</span>
                            ) : (
                              formatKm(km)
                            )}
                            {nearest.has(r.id) ? (
                              <span className="best">
                                <StatusPill tone="ok" icon="compass" label="Nearest" />
                              </span>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <th scope="row">Room types</th>
                      {rows.map((r) => {
                        const list = roomTypes.get(r.id) ?? [];
                        return (
                          <td key={r.id}>
                            {list.length ? (
                              <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: ".2rem" }}>
                                {list.map((t) => (
                                  <li key={t.type}>
                                    {ROOM_TYPE_LABEL[t.type]}, {t.free} free
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="muted">None listed</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <th scope="row">Beds available</th>
                      {rows.map((r) => (
                        <td key={r.id}>
                          <BedsPill available={r.beds_available} />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Facilities</th>
                      {rows.map((r) => (
                        <td key={r.id}>
                          <FacilityList keys={r.facilities} column />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Who can stay</th>
                      {rows.map((r) => (
                        <td key={r.id}>{r.gender_note || (r.gender ? GENDER_LABEL[r.gender] : "Not listed")}</td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Verification</th>
                      {rows.map((r) => (
                        <td key={r.id}>
                          <VerificationPill value={r.verification} />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Last updated</th>
                      {rows.map((r) => (
                        <td key={r.id}>
                          <Updated iso={r.last_updated_at} />
                          <StaleNote iso={r.last_updated_at} isStale={r.is_stale} />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">
                        <span className="sr-only">Actions</span>
                      </th>
                      {rows.map((r) => (
                        <td key={r.id}>
                          <div style={{ display: "grid", gap: ".4rem", justifyItems: "start" }}>
                            <Link className="btn sm soft" href={`/listings/${r.id}`}>
                              View details<span className="sr-only"> of {r.name}</span>
                            </Link>
                            <Link className="btn sm ghost" href={compareHref(rows.filter((x) => x.id !== r.id).map((x) => x.id), institution)}>
                              <Icon name="x" />
                              Remove<span className="sr-only"> {r.name} from the comparison</span>
                            </Link>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p className="muted" style={{ fontSize: ".8125rem" }}>
              Hostel prices are per term. Other prices are per month. Verification is not a guarantee.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
