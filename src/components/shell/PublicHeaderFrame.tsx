"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

/** The header element plus the small-screen menu button. The menu closes when the page changes. */
export function PublicHeaderFrame({ brand, children }: { brand: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  return (
    <header className="sh sh-pub" data-open={open ? "" : undefined}>
      <div className="wrap sh-in">
        {brand}
        <span className="sp" />
        <button
          type="button"
          className="btn ghost sm sh-menu"
          aria-expanded={open}
          aria-controls="public-menu"
          onClick={() => setOpenFor(open ? null : pathname)}
        >
          <Icon name={open ? "x" : "menu"} />
          <span>Menu</span>
        </button>
        <div id="public-menu" style={{ display: "contents" }}>
          {children}
        </div>
      </div>
    </header>
  );
}
