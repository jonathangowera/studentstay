/** Line icons copied from the design files. Decorative: always pair with visible text. */
const PATHS = {
  logo: <><path d="M4 20V10l8-6 8 6v10" /><path d="M9 20v-6h6v6" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  "check-c": <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.3 2.4 2.4 4.6-4.9" /></>,
  "x-c": <><circle cx="12" cy="12" r="8.5" /><path d="m9.5 9.5 5 5M14.5 9.5l-5 5" /></>,
  circle: <circle cx="12" cy="12" r="8.5" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  alert: <><path d="M12 4 3 20h18z" /><path d="M12 10v4M12 17.2v.1" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.1" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" /></>,
  logout: <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  building: <><rect x="5" y="3.5" width="14" height="17" rx="1.5" /><path d="M9 8h1.5M13.5 8H15M9 12h1.5M13.5 12H15M10 20.5v-4h4v4" /></>,
  "arrow-l": <path d="M19 12H5M11 6l-6 6 6 6" />,
  "arrow-r": <path d="M5 12h14M13 6l6 6-6 6" />,
  home: <><path d="M4 11 12 4l8 7" /><path d="M6 10v10h12V10" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  scale: <><path d="M12 4v16M6 20h12M5 8h14" /><path d="m5 8-3 6a3.5 3.5 0 0 0 6 0zM19 8l-3 6a3.5 3.5 0 0 0 6 0z" /></>,
  pin: <><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  wifi: <><path d="M3 9a14 14 0 0 1 18 0M6 12.5a9.5 9.5 0 0 1 12 0M9 16a5 5 0 0 1 6 0" /><circle cx="12" cy="19" r="1" /></>,
  water: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  bolt: <path d="M13 3 5 13h6l-1 8 8-10h-6z" />,
  shield: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />,
  "shield-check": <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  cctv: <><rect x="3" y="7" width="12" height="7" rx="1.5" /><path d="m15 9 6-2v8l-6-2M7 14v4h4" /></>,
  flame: <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />,
  book: <><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h10" /></>,
  laundry: <><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="13" r="4" /><path d="M8 6.5h.1M11 6.5h.1" /></>,
  bed: <><path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="11" r="1.6" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  cap: <><path d="m2 9 10-5 10 5-10 5z" /><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.4c1.9.8 3 2.6 3 5.6" /></>,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  "chev-l": <path d="m15 6-6 6 6 6" />,
  "chev-r": <path d="m9 6 6 6-6 6" />,
  trash: <path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" />,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M16 7l3 3" /></>,
  ban: <><circle cx="12" cy="12" r="8.5" /><path d="m6 6 12 12" /></>,
  pause: <path d="M9 5v14M15 5v14" />,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
  compass: <><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  bookmark: <path d="M7 4h10v17l-5-4-5 4z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "ic" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
