"use client";

import { useSyncExternalStore } from "react";

const ONE_MINUTE_MS = 60_000;

function subscribe(onChange: () => void): () => void {
  const timer = window.setInterval(onChange, ONE_MINUTE_MS);
  return () => window.clearInterval(timer);
}

/** Bucketed to the minute so the snapshot is stable between ticks. */
function getSnapshot(): number {
  return Math.floor(Date.now() / ONE_MINUTE_MS) * ONE_MINUTE_MS;
}

function getServerSnapshot(): null {
  return null;
}

/**
 * The current time, refreshed each minute: enough for the "now" line to creep
 * down the grid without a render every second. Null on the server and during
 * hydration, so both sides render the same thing first.
 */
export function useNow(): Date | null {
  const minute = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return minute === null ? null : new Date(minute);
}
