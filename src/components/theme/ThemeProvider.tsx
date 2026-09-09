"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { resolveTheme, type ResolvedTheme, type ThemePreference } from "@/lib/theme";
import {
  readThemePreference,
  subscribeThemePreference,
  writeThemePreference,
} from "@/lib/theme-store";

export interface ThemeContextValue {
  readonly preference: ThemePreference;
  readonly resolved: ResolvedTheme;
  /**
   * False on the server and during hydration, when the stored preference is
   * not yet known. Anything that renders the preference waits for this rather
   * than flashing "System" and then correcting itself.
   */
  readonly isReady: boolean;
  readonly setTheme: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = "(prefers-color-scheme: dark)";

function getServerPreference(): null {
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const storedPreference = useSyncExternalStore(
    subscribeThemePreference,
    readThemePreference,
    getServerPreference,
  );
  const prefersDark = useMediaQuery(DARK_QUERY);

  const isReady = storedPreference !== null && prefersDark !== null;
  const preference = storedPreference ?? "system";
  const resolved = resolveTheme(preference, prefersDark === true);

  // The boot script in the root layout applied the stored choice before
  // hydration; this keeps the class in step with changes made afterwards.
  // Skipped until the real values are in hand, so it never applies the
  // server's placeholder over what the script already set.
  useEffect(() => {
    if (!isReady) return;
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  }, [isReady, resolved]);

  const setTheme = useCallback((next: ThemePreference) => writeThemePreference(next), []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, isReady, setTheme }),
    [preference, resolved, isReady, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return context;
}
