import { auth } from "@/auth";
import {
  HOUSEHOLD_ICON_NODES,
  type IconNode,
} from "@/lib/household-icon-nodes";
import {
  DEFAULT_HOUSEHOLD_COLOR,
  DEFAULT_HOUSEHOLD_ICON,
  householdTileStops,
} from "@/lib/household-icons";
import { prisma } from "@/lib/prisma";

/**
 * The browser tab icon, drawn from the household's own colour and glyph.
 *
 * Hand-built SVG rather than `ImageResponse`, for two reasons. Satori cannot
 * invoke a Lucide component at all — `lucide-react`'s shared `Icon.mjs` is
 * marked "use client", so calling it server-side throws. And an SVG stays sharp
 * at every size a browser asks for, where `ImageResponse` would fix a raster at
 * one.
 *
 * The colour and the icon allow-list are the same ones the sidebar tile uses,
 * so the tab and the tile cannot drift apart.
 */
export const dynamic = "force-dynamic";
export const contentType = "image/svg+xml";
export const size = { width: 32, height: 32 };

const CANVAS = 32;
/** Lucide draws on a 24-unit grid; this scales it down inside the circle. */
const GLYPH = 18;
const LUCIDE_GRID = 24;
const GLYPH_SCALE = GLYPH / LUCIDE_GRID;
const GLYPH_OFFSET = (CANVAS - GLYPH) / 2;
const GLYPH_STROKE = 2.25;

interface Branding {
  color: string;
  iconKey: string;
}

const DEFAULT_BRANDING: Branding = {
  color: DEFAULT_HOUSEHOLD_COLOR,
  iconKey: DEFAULT_HOUSEHOLD_ICON,
};

/**
 * Signed-out visitors and anyone not yet in a household get the default mark.
 * Never throws: a favicon that fails is a broken tab on every page, so any
 * lookup problem degrades to the default rather than surfacing an error.
 */
async function currentBranding(): Promise<Branding> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return DEFAULT_BRANDING;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { household: { select: { color: true, icon: true } } },
    });
    if (!user?.household) return DEFAULT_BRANDING;

    return { color: user.household.color, iconKey: user.household.icon };
  } catch (error: unknown) {
    console.error("Falling back to the default favicon", error);
    return DEFAULT_BRANDING;
  }
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/**
 * Lucide node attributes are already SVG-cased (`d`, `cx`, `x1`), except for
 * React's `key`, which is bookkeeping rather than markup and must not be
 * emitted.
 */
function renderNode([tag, attributes]: readonly [
  string,
  Record<string, unknown>,
]): string {
  const rendered = Object.entries(attributes)
    .filter(([name]) => name !== "key")
    .map(([name, value]) => `${name}="${escapeAttribute(String(value))}"`)
    .join(" ");
  return `<${tag} ${rendered} />`;
}

function renderGlyph(iconKey: string): string {
  // Bracket access would walk the prototype chain, so a stored value of
  // "constructor" resolves to a function instead of undefined and `??` never
  // fires. Household.icon is plain text and can hold anything.
  const node: IconNode = Object.hasOwn(HOUSEHOLD_ICON_NODES, iconKey)
    ? HOUSEHOLD_ICON_NODES[iconKey]
    : HOUSEHOLD_ICON_NODES[DEFAULT_HOUSEHOLD_ICON];
  return node.map(renderNode).join("");
}

export default async function Icon(): Promise<Response> {
  const { color, iconKey } = await currentBranding();
  const [from, to] = householdTileStops(color);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}" role="img" aria-label="Family calendar">
<defs><linearGradient id="tile" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<circle cx="${CANVAS / 2}" cy="${CANVAS / 2}" r="${CANVAS / 2}" fill="url(#tile)"/>
<g transform="translate(${GLYPH_OFFSET} ${GLYPH_OFFSET}) scale(${GLYPH_SCALE})" fill="none" stroke="#ffffff" stroke-width="${GLYPH_STROKE}" stroke-linecap="round" stroke-linejoin="round">${renderGlyph(iconKey)}</g>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": contentType,
      // Private: the mark varies per signed-in household, so no shared cache may
      // keep a copy. must-revalidate so a change in settings shows up on the
      // next load rather than whenever the browser feels like it.
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
