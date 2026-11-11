export default function Loading() {
  return (
    <div className="wrap main" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading the comparison…</span>
      <div aria-hidden="true">
        <div className="pg-head">
          <span className="skel" style={{ width: "14rem", height: "2rem" }} />
          <span className="skel" style={{ width: "24rem", maxWidth: "100%", marginTop: ".6rem" }} />
        </div>
        <div className="card card-b" style={{ marginBottom: "1rem" }}>
          <span className="skel" style={{ width: "16rem", maxWidth: "100%", height: "2.75rem" }} />
        </div>
        <div className="card card-b stack">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="skel" style={{ height: "1.6rem" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
