import type { CalendarTheme } from "calendarkit-pro";

/**
 * Colors are deliberately omitted.
 *
 * CalendarKit's `theme.colors` converts each value to a legacy shadcn HSL
 * triplet ("0 0% 100%") and assigns it to --background, --foreground, --primary,
 * --secondary, --muted, --accent and --border. This app defines those same
 * variables as modern oklch colors, so supplying theme colors overwrites them
 * with values Tailwind cannot resolve, and every token-based utility inside the
 * calendar silently loses its color.
 *
 * Leaving them out lets the calendar inherit the palette in globals.css, which
 * also means dark mode is handled once, by the `dark` class, for the whole app.
 */
export const CALENDAR_THEME: CalendarTheme = {
  fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
  borderRadius: "0.75rem",
};
