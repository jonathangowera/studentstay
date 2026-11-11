import type { Metadata } from "next";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { ListingCard } from "@/components/listings/ListingCard";
import { CompareBar } from "@/components/listings/Compare";
import { FilterFields } from "@/components/listings/FilterFields";
import { SearchLayout, FILTER_FORM_ID } from "@/components/listings/SearchLayout";
import { reportError, type FriendlyError } from "@/lib/errors";
import { formatKwacha, plural } from "@/lib/format";
import {
  SORTS,
  SORT_LABEL,
  effectiveSort,
  filtersToParams,
  hasActiveFilters,
  listingsHref,
  pageCount,
  pageNumbers,
  parseListingFilters,
  type ListingFilters,
} from "@/lib/listings/filters";
import {
  FACILITIES,
  GENDER_LABEL,
  LISTING_TYPE_LABEL,
  ROOM_TYPE_LABEL,
  institutionShortName,
} from "@/lib/listings/labels";
import { institutions, savedListingIds, searchListings, type Institution, type SearchResult } from "@/server/listings";
import { getViewer } from "@/server/viewer";

export const metadata: Metadata = { title: "Find a place to stay" };

type Chip = { key: string; label: string; href: string };

/** One removable chip per active filter value. */
function chips(f: ListingFilters, instName: (code: string) => string): Chip[] {
  const out: Chip[] = [];
  const base = { ...f, page: 1 };
  if (f.institution) out.push({ key: "inst", label: `Near ${instName(f.institution)}`, href: listingsHref(base, { institution: null }) });
  if (f.area) out.push({ key: "area", label: f.area, href: listingsHref(base, { area: null }) });
  if (f.min !== null) out.push({ key: "min", label: `From ${formatKwacha(f.min)}`, href: listingsHref(base, { min: null }) });
  if (f.max !== null) out.push({ key: "max", label: `Up to ${formatKwacha(f.max)}`, href: listingsHref(base, { max: null }) });
  f.types.forEach((t) =>
    out.push({ key: `t-${t}`, label: LISTING_TYPE_LABEL[t], href: listingsHref(base, { types: f.types.filter((x) => x !== t) }) }),
  );
  f.rooms.forEach((r) =>
    out.push({ key: `r-${r}`, label: `${ROOM_TYPE_LABEL[r]} room`, href: listingsHref(base, { rooms: f.rooms.filter((x) => x !== r) }) }),
  );
  f.genders.forEach((g) =>
    out.push({ key: `g-${g}`, label: GENDER_LABEL[g], href: listingsHref(base, { genders: f.genders.filter((x) => x !== g) }) }),
  );
  f.facilities.forEach((k) =>
    out.push({
      key: `f-${k}`,
      label: FACILITIES.find((x) => x.key === k)?.label ?? k,
      href: listingsHref(base, { facilities: f.facilities.filter((x) => x !== k) }),
    }),
  );
  if (f.freeOnly) out.push({ key: "free", label: "Free beds only", href: listingsHref(base, { freeOnly: false }) });
  if (f.hideStale) out.push({ key: "fresh", label: "Updated in the last 30 days", href: listingsHref(base, { hideStale: false }) });
  return out;
}

export default async function ListingsPage({ searchParams }: PageProps<"/listings">) {
  const raw = await searchParams;
  const parsed = parseListingFilters(raw);

  let insts: Institution[] = [];
  let loadError: FriendlyError | null = null;
  try {
    insts = await institutions();
  } catch (err) {
    unstable_rethrow(err);
    loadError = reportError("load institutions", err);
  }

  // Unknown institution codes are dropped, so the page never filters on something the visitor cannot see.
  const f: ListingFilters =
    parsed.institution && insts.length && !insts.some((i) => i.code === parsed.institution)
      ? { ...parsed, institution: null }
      : parsed;

  // One URL per search: odd forms (the home page budget band, comma lists, junk) go to the canonical URL,
  // so the filter form always matches the address bar.
  const current = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) ([] as string[]).concat(v ?? []).forEach((x) => current.append(k, x));
  const canonical = filtersToParams(f).toString();
  if (current.toString() !== canonical && !loadError) redirect(canonical ? `/listings?${canonical}` : "/listings");

  const viewer = await getViewer();
  let result: SearchResult = { rows: [], total: 0, ms: 0 };
  if (!loadError) {
    try {
      result = await searchListings(f);
    } catch (err) {
      unstable_rethrow(err);
      loadError = reportError("search listings", err);
    }
  }
  const saved = await savedListingIds(viewer.studentId, result.rows.map((r) => r.id));

  const instName = (code: string) => institutionShortName(code, insts.find((i) => i.code === code)?.name);
  const { distanceNeedsInstitution } = effectiveSort(f);
  const pages = pageCount(result.total);
  const returnTo = listingsHref(f);
  const chipList = chips(f, instName);
  const filtered = hasActiveFilters(f);

  const summary = f.institution
    ? `near ${instName(f.institution)}`
    : f.area
      ? `in ${f.area}`
      : "in Lusaka";

  return (
    <div className="wrap main">
      <div className="pg-head">
        <h1>Find a place to stay</h1>
        <p>Prices are in Zambian kwacha. Distances are approximate road distances to each institution.</p>
      </div>

      <SearchLayout key="search" activeCount={chipList.length} fields={<FilterFields f={f} institutions={insts} />}>
        <div className="rbar">
          <h2 id="results-h" style={{ fontSize: "1rem" }}>
            {plural(result.total, "place")} <span className="muted" style={{ fontWeight: 400 }}>{summary}</span>
          </h2>
          <div className="row">
            <label className="row muted" style={{ fontSize: ".8125rem" }}>
              Sort by
              <select name="sort" form={FILTER_FORM_ID} defaultValue={f.sort}>
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <noscript>
              <button className="btn sm" type="submit" form={FILTER_FORM_ID}>
                Sort
              </button>
            </noscript>
            <div className="seg" role="group" aria-label="View">
              <Link href={listingsHref(f, { view: "grid" })} aria-current={f.view === "grid" ? "true" : undefined} aria-label="Grid view" scroll={false}>
                <Icon name="grid" />
              </Link>
              <Link href={listingsHref(f, { view: "list" })} aria-current={f.view === "list" ? "true" : undefined} aria-label="List view" scroll={false}>
                <Icon name="list" />
              </Link>
            </div>
          </div>
        </div>

        {chipList.length ? (
          <ul className="chips" aria-label="Filters on">
            {chipList.map((c) => (
              <li key={c.key}>
                <Link href={c.href} scroll={false}>
                  {c.label}
                  <Icon name="x" />
                  <span className="sr-only">Remove this filter</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {distanceNeedsInstitution ? (
          <div style={{ marginBottom: "1rem" }}>
            <Callout tone="info" title="Choose an institution to sort by distance.">
              Showing best match for now.
            </Callout>
          </div>
        ) : null}

        {loadError ? (
          <ErrorNotice message="We could not load listings just now. Please try again." reference={loadError.reference} />
        ) : result.rows.length === 0 ? (
          <div className="card">
            <EmptyState icon="search" title={f.page > 1 && result.total > 0 ? "There is no page with that number." : "No places match your filters."}>
              {f.page > 1 && result.total > 0
                ? "Go back to the first page of results."
                : filtered
                  ? "Try removing a filter or widening your budget."
                  : "No places are listed yet. Check again soon."}
            </EmptyState>
            <div className="row" style={{ justifyContent: "center", paddingBottom: "2rem" }}>
              {f.page > 1 && result.total > 0 ? (
                <Link className="btn primary" href={listingsHref(f, { page: 1 })}>
                  Go to page 1
                </Link>
              ) : filtered ? (
                <Link className="btn primary" href={f.view === "list" ? "/listings?view=list" : "/listings"}>
                  Clear filters
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <ul className={f.view === "list" ? "lcards rows" : "lcards"}>
              {result.rows.map((c) => (
                <li key={c.id}>
                  <ListingCard
                    card={c}
                    institution={f.institution}
                    heart={viewer.heart}
                    saved={saved.has(c.id)}
                    returnTo={returnTo}
                    compare
                  />
                </li>
              ))}
            </ul>
            {pages > 1 ? (
              <nav aria-label="Result pages">
                <ul className="pages">
                  <li>
                    {f.page > 1 ? (
                      <Link href={listingsHref(f, { page: f.page - 1 })}>
                        <Icon name="chev-l" />
                        <span>Previous</span>
                      </Link>
                    ) : (
                      <span className="off" aria-hidden="true">
                        Previous
                      </span>
                    )}
                  </li>
                  {pageNumbers(f.page, pages).map((n, i) =>
                    n === "gap" ? (
                      <li key={`gap${i}`} aria-hidden="true">
                        <span className="off">…</span>
                      </li>
                    ) : (
                      <li key={n}>
                        <Link href={listingsHref(f, { page: n })} aria-current={n === f.page ? "page" : undefined}>
                          <span className="sr-only">Page </span>
                          {n}
                        </Link>
                      </li>
                    ),
                  )}
                  <li>
                    {f.page < pages ? (
                      <Link href={listingsHref(f, { page: f.page + 1 })}>
                        <span>Next</span>
                        <Icon name="chev-r" />
                      </Link>
                    ) : (
                      <span className="off" aria-hidden="true">
                        Next
                      </span>
                    )}
                  </li>
                </ul>
              </nav>
            ) : null}
          </>
        )}
        <CompareBar institution={f.institution} />
      </SearchLayout>
    </div>
  );
}
