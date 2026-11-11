import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { ListingFilters } from "@/lib/listings/filters";
import {
  FACILITIES,
  GENDERS,
  GENDER_LABEL,
  LISTING_TYPES,
  LISTING_TYPE_LABEL,
  ROOM_TYPES,
  ROOM_TYPE_LABEL,
  institutionShortName,
} from "@/lib/listings/labels";
import type { Institution } from "@/server/listings";

/** The fields inside the filter form. Names match parseListingFilters. */
export function FilterFields({ f, institutions }: { f: ListingFilters; institutions: Institution[] }) {
  return (
    <>
      {/* Keep the parts of the URL that are not filters. Page always goes back to 1 on a new search. */}
      {f.view === "list" ? <input type="hidden" name="view" value="list" /> : null}
      {f.area ? <input type="hidden" name="area" value={f.area} /> : null}
      <div className="fsets">
        <fieldset className="fset">
          <legend>Institution</legend>
          <label className="check">
            <input type="radio" name="institution" value="" defaultChecked={!f.institution} />
            Any institution
          </label>
          {institutions.map((i) => (
            <label className="check" key={i.code}>
              <input type="radio" name="institution" value={i.code} defaultChecked={f.institution === i.code} />
              {institutionShortName(i.code, i.name)}
            </label>
          ))}
        </fieldset>

        <fieldset className="fset" aria-describedby="budget-note">
          <legend>Monthly budget (ZMW)</legend>
          <div className="range">
            <div className="field">
              <label htmlFor="f-min">Min</label>
              <input id="f-min" type="number" name="min" inputMode="numeric" min={0} step={50} defaultValue={f.min ?? ""} placeholder="0" />
            </div>
            <div className="field">
              <label htmlFor="f-max">Max</label>
              <input id="f-max" type="number" name="max" inputMode="numeric" min={0} step={50} defaultValue={f.max ?? ""} placeholder="Any" />
            </div>
          </div>
          <p id="budget-note" className="hint">
            Hostels are priced per term.
          </p>
        </fieldset>

        <fieldset className="fset">
          <legend>Type</legend>
          {LISTING_TYPES.map((t) => (
            <label className="check" key={t}>
              <input type="checkbox" name="type" value={t} defaultChecked={f.types.includes(t)} />
              {LISTING_TYPE_LABEL[t]}
            </label>
          ))}
        </fieldset>

        <fieldset className="fset">
          <legend>Room type</legend>
          {ROOM_TYPES.map((r) => (
            <label className="check" key={r}>
              <input type="checkbox" name="room" value={r} defaultChecked={f.rooms.includes(r)} />
              {ROOM_TYPE_LABEL[r]}
            </label>
          ))}
        </fieldset>

        <fieldset className="fset">
          <legend>Who can stay</legend>
          {GENDERS.map((g) => (
            <label className="check" key={g}>
              <input type="checkbox" name="gender" value={g} defaultChecked={f.genders.includes(g)} />
              {GENDER_LABEL[g]}
            </label>
          ))}
        </fieldset>

        <fieldset className="fset">
          <legend>Facilities</legend>
          {FACILITIES.map((fac) => (
            <label className="check" key={fac.key}>
              <input type="checkbox" name="facilities" value={fac.key} defaultChecked={f.facilities.includes(fac.key)} />
              <Icon name={fac.icon} />
              {fac.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="fset">
          <legend>Availability</legend>
          <label className="check">
            <input type="checkbox" name="free" value="1" defaultChecked={f.freeOnly} />
            Only places with free beds
          </label>
          <label className="check">
            <input type="checkbox" name="fresh" value="1" defaultChecked={f.hideStale} />
            Hide places not updated for 30 days
          </label>
        </fieldset>
      </div>
      <div className="filters-actions" style={{ marginTop: "1rem" }}>
        <button className="btn primary sm" type="submit">
          Apply filters
        </button>
        <Link className="btn ghost sm" href={f.view === "list" ? "/listings?view=list" : "/listings"}>
          Clear all
        </Link>
      </div>
    </>
  );
}
