import { THEME_STORAGE_KEY, isThemePreference, type ThemePreference } from "@/lib/theme";

/**
 * localStorage as an external store for the theme preference, so React can
 * subscribe to it with useSyncExternalStore. The browser only fires `storage`
 * for OTHER tabs; writes in this tab notify the local listeners directly.
 */

const listeners = new Set<() => void>();

export function subscribeThemePreference(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    // Private windows and locked-down browsers throw on access; the default
    // is the right answer there.
    return "system";
  }
}

export function writeThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // The choice still applies for this page view; it just will not persist.
  }
  listeners.forEach((listener) => listener());
}
