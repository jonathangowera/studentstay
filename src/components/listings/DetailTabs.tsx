"use client";

import { useRef, useState } from "react";

export type TabPanel = { id: string; label: string; content: React.ReactNode };

/**
 * Tabs following the ARIA tabs pattern: arrow keys, Home and End move between tabs, Tab moves into the panel.
 * Panels are rendered on the server; this only switches which one is shown.
 */
export function DetailTabs({ panels, label }: { panels: TabPanel[]; label: string }) {
  const [active, setActive] = useState(panels[0]?.id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: React.KeyboardEvent, index: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % panels.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + panels.length) % panels.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = panels.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setActive(panels[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div>
      <div className="tabs" role="tablist" aria-label={label}>
        {panels.map((p, i) => (
          <button
            key={p.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${p.id}`}
            aria-selected={active === p.id}
            aria-controls={`panel-${p.id}`}
            tabIndex={active === p.id ? 0 : -1}
            onClick={() => setActive(p.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {panels.map((p) => (
        <div
          key={p.id}
          role="tabpanel"
          id={`panel-${p.id}`}
          aria-labelledby={`tab-${p.id}`}
          hidden={active !== p.id}
          tabIndex={0}
          className="card card-b tabpanel"
        >
          {p.content}
        </div>
      ))}
    </div>
  );
}
