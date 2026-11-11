export default function Loading() {
  return (
    <div className="wrap main" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading availability…</span>
      <div aria-hidden="true">
        <span className="skel" style={{ width: "14rem", marginBottom: ".75rem" }} />
        <div className="pg-head">
          <span className="skel" style={{ width: "12rem", height: "2rem" }} />
          <span className="skel" style={{ width: "20rem", maxWidth: "100%", marginTop: ".6rem" }} />
        </div>
        <div className="card card-b stack">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className="skel" style={{ height: "2.4rem" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
