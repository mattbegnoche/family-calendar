"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a CSS media query matches, kept in step with the browser.
 *
 * `useSyncExternalStore` rather than an effect that calls setState: the
 * server has no window, so the server snapshot is null and the first client
 * render adopts the real value without a cascading re-render or a hydration
 * mismatch. Callers treat null as "not known yet".
 */
export function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}
