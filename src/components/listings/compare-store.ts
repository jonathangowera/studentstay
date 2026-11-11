"use client";

/**
 * The places ticked for comparison. Kept in this browser only (localStorage), so the choice survives
 * moving between result pages. It is a convenience: the page works the same if storage is blocked.
 */
import { useSyncExternalStore } from "react";
import { COMPARE_LIMIT_MESSAGE, toggleCompare } from "@/lib/listings/compare";

const KEY = "studentstay.compare";
type State = { ids: string[]; message: string | null };
const EMPTY: State = { ids: [], message: null };

let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, 3) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Storage blocked (private window). The selection still works until the page is left.
  }
}

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  if (!loaded) {
    loaded = true;
    state = { ids: read(), message: null };
  }
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) set({ ids: read(), message: null });
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCompare() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );
  return {
    ids: snapshot.ids,
    message: snapshot.message,
    toggle(id: string, on: boolean): boolean {
      const res = toggleCompare(state.ids, id, on);
      if (!res.blocked) write(res.selected);
      set({ ids: res.selected, message: res.blocked ? COMPARE_LIMIT_MESSAGE : null });
      return !res.blocked;
    },
    clear() {
      write([]);
      set(EMPTY);
    },
  };
}
