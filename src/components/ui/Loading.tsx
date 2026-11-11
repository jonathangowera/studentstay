/** Placeholder shown while a page loads. Announced politely to screen readers. */
export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="wrap main" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}…</span>
      <div className="pg-head" aria-hidden="true">
        <span className="skel" style={{ width: "14rem", height: "2rem" }} />
        <span className="skel" style={{ width: "22rem", maxWidth: "100%", marginTop: ".6rem" }} />
      </div>
      <div className="card card-b stack" aria-hidden="true">
        <span className="skel" style={{ width: "60%" }} />
        <span className="skel" style={{ width: "90%" }} />
        <span className="skel" style={{ width: "75%" }} />
      </div>
    </div>
  );
}
