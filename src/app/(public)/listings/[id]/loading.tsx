/** Same frame as the details page, so nothing jumps when it loads. */
export default function Loading() {
  return (
    <div className="wrap main" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading this place…</span>
      <div aria-hidden="true">
        <span className="skel" style={{ width: "12rem", marginBottom: ".75rem" }} />
        <div className="gallery">
          <span className="skel" style={{ height: "100%" }} />
          <span className="skel" style={{ height: "100%" }} />
          <span className="skel" style={{ height: "100%" }} />
        </div>
        <div className="dgrid">
          <div className="stack">
            <span className="skel" style={{ width: "60%", height: "2rem" }} />
            <span className="skel" style={{ width: "45%" }} />
            <span className="skel" style={{ width: "70%", height: "1.4rem" }} />
            <div className="card card-b stack">
              <span className="skel" style={{ width: "30%", height: "2.5rem" }} />
              <span className="skel" style={{ width: "90%" }} />
              <span className="skel" style={{ width: "80%" }} />
              <span className="skel" style={{ width: "85%" }} />
            </div>
          </div>
          <div className="buy">
            <span className="skel" style={{ width: "70%", height: "1.8rem" }} />
            <span className="skel" style={{ width: "50%" }} />
            <span className="skel" style={{ height: "2.75rem", borderRadius: "999px" }} />
            <span className="skel" style={{ height: "2.75rem", borderRadius: "999px" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
