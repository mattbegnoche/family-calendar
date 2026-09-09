/**
 * Theme preference: what the person chose, as opposed to what is on screen.
 *
 * "system" follows the OS setting and is the default, so a wall display that
 * dims at night does so without anyone touching the app. The provider in
 * src/components/theme/ThemeProvider.tsx applies the resolved value by
 * toggling the `dark` class that globals.css keys every colour token on.
 */

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

export const THEME_PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

export const THEME_LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

/** The order the sidebar button cycles through: system → light → dark → system. */
export function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = THEME_PREFERENCES.indexOf(current);
  return THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length];
}

/**
 * Runs inline in <head>, before first paint, so a dark-mode reload never
 * flashes light. Reads the same key the provider writes and applies the same
 * two things the provider does: the `dark` class and `color-scheme`.
 */
export const THEME_BOOT_SCRIPT = [
  "(function(){try{",
  `var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});`,
  'var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);',
  "var r=document.documentElement;",
  'r.classList.toggle("dark",d);',
  'r.style.colorScheme=d?"dark":"light";',
  "}catch(e){}})();",
].join("");
