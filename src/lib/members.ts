/**
 * Member identity helpers: the colour palette onboarding offers, and the rules
 * that turn a typed name into the stable `slug` the schema requires.
 *
 * No "server-only" here on purpose — the onboarding form is a client component
 * and renders the same palette the server validates against, so both sides must
 * be able to import this.
 */

/** Reserved for the one MemberKind.SHARED row every household gets. */
export const SHARED_MEMBER_SLUG = "everyone";
export const SHARED_MEMBER_NAME = "Everyone";

/**
 * Palette offered in the onboarding form. Chosen to stay legible against both
 * the light and dark calendar surfaces once src/lib/event-colors.ts mixes them
 * down to a 20–32% fill. Six-digit hex is mandatory: the database CHECK
 * constraint and event-colors.ts string concatenation both depend on it.
 */
export const MEMBER_COLORS: readonly string[] = [
  "#4f46e5", // indigo
  "#0891b2", // cyan
  "#7c3aed", // violet
  "#db2777", // pink
  "#ea580c", // orange
  "#16a34a", // green
  "#ca8a04", // amber
  "#dc2626", // red
  "#0284c7", // sky
  "#65a30d", // lime
];

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/**
 * A colour for the nth member, cycling once the palette runs out. Keeps the
 * first few members visually distinct without asking anyone to pick.
 */
export function defaultColorForIndex(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

const MAX_SLUG_LENGTH = 40;

/**
 * "Mom" -> "mom", "Aunt Jo!" -> "aunt-jo". Returns an empty string when the
 * name is all punctuation or non-Latin script, which callers must handle —
 * `uniqueMemberSlug` falls back to a positional slug in that case, so a
 * household of members named only in e.g. Japanese still gets valid keys.
 */
export function slugifyMemberName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

/**
 * A slug unique within one household. `taken` is the set of slugs already in
 * use; the caller is responsible for it including SHARED_MEMBER_SLUG, which is
 * why that constant is exported.
 *
 * Uniqueness is enforced by @@unique([householdId, slug]) regardless — this
 * just avoids provoking the constraint for the ordinary "two people called Sam"
 * case.
 */
export function uniqueMemberSlug(name: string, taken: ReadonlySet<string>): string {
  const base = slugifyMemberName(name) || "member";
  if (!taken.has(base)) return base;

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  // 98 members with the same name is not a real household; fall back to
  // something guaranteed unique rather than looping forever.
  return `${base}-${Date.now().toString(36)}`;
}

export const MAX_MEMBER_NAME_LENGTH = 60;
export const MAX_HOUSEHOLD_NAME_LENGTH = 80;

/** Shared by the create-family and join forms so both reject the same input. */
export function validateMemberName(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_MEMBER_NAME_LENGTH) return null;
  return trimmed;
}
