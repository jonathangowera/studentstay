import { buildingArt } from "@/lib/listings/art";

/**
 * The one place a listing picture is drawn. Today it draws a placeholder building, picked from the listing id.
 * When real photos exist, pass `src` (or look it up here) and every page switches over with this one change.
 *
 * alt: describe the picture for screen readers. Pass "" when the listing name is already next to it.
 * variant: gives a different picture for the same listing (gallery views), still stable between visits.
 */
export function ListingImage({
  id,
  alt,
  src,
  variant,
}: {
  id: string;
  alt: string;
  src?: string | null;
  variant?: string;
}) {
  if (src) {
    // Plain img on purpose: no image host is configured yet. Swap for next/image when photos have a home.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" />;
  }

  const art = buildingArt(variant ? `${id}:${variant}` : id);
  const a11y = alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true as const };
  return (
    <svg className="art" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" focusable="false" {...a11y}>
      <rect width="400" height="240" fill="var(--art-sky)" />
      <circle cx={art.sun.cx} cy={art.sun.cy} r={art.sun.r} fill="var(--art-sun)" />
      <rect y="196" width="400" height="44" fill="var(--art-ground)" />
      {art.blocks.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="3" fill={`var(--art-${b.fill})`} />
          <rect x={b.x} y={b.y} width={b.w} height="8" rx="3" fill="var(--art-roof)" />
          {b.windows.map((w, j) => (
            <rect key={j} x={w.x} y={w.y} width={w.w} height={w.h} rx="2" fill="var(--art-win)" opacity={w.lit ? 0.95 : 0.35} />
          ))}
          <rect x={b.door.x} y={b.door.y} width={b.door.w} height={b.door.h} rx="2" fill="var(--art-door)" />
        </g>
      ))}
      {art.trees.map((t, i) => (
        <g key={`t${i}`}>
          <circle cx={t.cx} cy="176" r={t.r} fill="var(--art-tree)" />
          <rect x={t.cx - 2} y="186" width="4" height="12" fill="var(--art-door)" />
        </g>
      ))}
    </svg>
  );
}
