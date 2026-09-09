import type { CSSProperties } from "react";

import { DEFAULT_HOUSEHOLD_COLOR } from "@/lib/household-icons";
import { isHexColor } from "@/lib/members";

/**
 * The household's colour as the dashboard's accent.
 *
 * The dashboard layout puts these variables on the sidebar provider, and the
 * `.family-theme` rules in globals.css point --primary, --ring and --accent at
 * them. Every button, active state and focus ring that reads those tokens
 * then wears the family colour without any component naming it.
 */

/** Text colours for a solid fill of the family colour. */
const LIGHT_TEXT = "#ffffff";
const DARK_TEXT = "#0f172a";

/** Above this relative luminance a fill is light enough to need dark text. */
const LIGHT_FILL_THRESHOLD = 0.45;

function channel(hex: string, offset: number): number {
  const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
  // sRGB → linear, per WCAG.
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a 6-digit hex colour, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

/** White on most of the palette; near-black on the light amber and lime ends. */
export function contrastingTextColor(hex: string): string {
  return relativeLuminance(hex) > LIGHT_FILL_THRESHOLD ? DARK_TEXT : LIGHT_TEXT;
}

export function familyThemeStyle(color: string): CSSProperties {
  const family = isHexColor(color) ? color : DEFAULT_HOUSEHOLD_COLOR;
  return {
    "--family": family,
    "--family-foreground": contrastingTextColor(family),
  } as CSSProperties;
}
