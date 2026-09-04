/**
 * CalendarKit hardcodes an event card's fill as `${event.color}15` — 8% alpha —
 * as an inline style. That reads as a soft pastel on white, which is what it was
 * designed for, but 8% of any hue against the dark surface is indistinguishable
 * from the grid, so every card collapses into the same slate rectangle no matter
 * whose event it is.
 *
 * The library exposes no render hook for event cards, and an inline style
 * outranks any stylesheet, so the only lever is an `!important` override keyed on
 * the color CalendarKit wrote into the style attribute. Rules are generated from
 * FAMILY_MEMBERS so the palette still has exactly one source of truth.
 *
 * `.glass` is the scope: CalendarKit puts it on both event-card renderers and
 * nowhere else, and ships no CSS defining it. That keeps this off the calendar
 * list's color swatches, which carry the same hex in their own inline style.
 *
 * Coupling to watch: this assumes CalendarKit keeps writing the color as the hex
 * we handed it. If a future version changes that, cards fall back to the library's
 * faint default rather than breaking outright.
 */
const FILL_LIGHT = "20%";
const BORDER_LIGHT = "45%";
const FILL_DARK = "32%";
const BORDER_DARK = "60%";

/** Guards the <style> tag these strings are interpolated into. */
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function mix(color: string, amount: string): string {
  return `color-mix(in srgb, ${color} ${amount}, transparent)`;
}

function rulesFor(color: string): string {
  const card = `.glass[style*="${color}"]`;
  return [
    `${card}{`,
    `background-color:${mix(color, FILL_LIGHT)}!important;`,
    `border-color:${mix(color, BORDER_LIGHT)}!important;`,
    // Re-asserted because the border-color shorthand above outranks the inline
    // longhand, which is what gives each card its full-strength left rail.
    `border-left-color:${color}!important;`,
    `}`,
    `.dark ${card}{`,
    `background-color:${mix(color, FILL_DARK)}!important;`,
    `border-color:${mix(color, BORDER_DARK)}!important;`,
    `border-left-color:${color}!important;`,
    `}`,
  ].join("");
}

/**
 * Build the override rules for a set of member colours.
 *
 * A function, not a module constant: members come from the database, so a
 * colour added after boot would otherwise get no rule and its events would
 * render at CalendarKit's faint 8% default with nothing to explain why.
 */
export function buildEventColorCss(colors: readonly string[]): string {
  const unique = [...new Set(colors)].filter((color) => HEX_COLOR.test(color));
  return unique.map(rulesFor).join("\n");
}
