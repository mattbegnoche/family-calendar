import { __iconNode as cake } from "lucide-react/dist/esm/icons/cake.mjs";
import { __iconNode as calendar } from "lucide-react/dist/esm/icons/calendar.mjs";
import { __iconNode as heart } from "lucide-react/dist/esm/icons/heart.mjs";
import { __iconNode as house } from "lucide-react/dist/esm/icons/house.mjs";
import { __iconNode as moon } from "lucide-react/dist/esm/icons/moon.mjs";
import { __iconNode as mountain } from "lucide-react/dist/esm/icons/mountain.mjs";
import { __iconNode as pawPrint } from "lucide-react/dist/esm/icons/paw-print.mjs";
import { __iconNode as rocket } from "lucide-react/dist/esm/icons/rocket.mjs";
import { __iconNode as sailboat } from "lucide-react/dist/esm/icons/sailboat.mjs";
// `smile` is an alias module that re-exports another icon and therefore
// carries no __iconNode of its own; import the icon it points at.
import { __iconNode as smile } from "lucide-react/dist/esm/icons/face-slightly-smiling.mjs";
import { __iconNode as sparkles } from "lucide-react/dist/esm/icons/sparkles.mjs";
import { __iconNode as star } from "lucide-react/dist/esm/icons/star.mjs";
import { __iconNode as sun } from "lucide-react/dist/esm/icons/sun.mjs";
import { __iconNode as tent } from "lucide-react/dist/esm/icons/tent.mjs";
import { __iconNode as treePine } from "lucide-react/dist/esm/icons/tree-pine.mjs";
import { __iconNode as users } from "lucide-react/dist/esm/icons/users.mjs";

/**
 * The same icons as HOUSEHOLD_ICONS, as raw SVG node data rather than React
 * components.
 *
 * Two representations exist because the components cannot be used everywhere.
 * `lucide-react`'s shared `Icon.mjs` is marked "use client", so anything that
 * invokes a Lucide component on the server — Satori inside `ImageResponse`, for
 * instance — fails with "Attempted to call the default export … from the
 * server". The per-icon modules carry no such directive, so their `__iconNode`
 * data is safe to read while generating the favicon.
 *
 * These are deep imports because lucide-react publishes no `exports` map and
 * surfaces the node data nowhere else. If its layout ever changes, this file
 * fails at build time rather than silently.
 *
 * household-icon-nodes.test.ts asserts these keys match HOUSEHOLD_ICONS exactly,
 * so the two lists cannot drift.
 */
export type IconNode = readonly (readonly [string, Record<string, unknown>])[];

export const HOUSEHOLD_ICON_NODES: Readonly<Record<string, IconNode>> = {
  calendar,
  house,
  heart,
  star,
  sun,
  moon,
  "tree-pine": treePine,
  "paw-print": pawPrint,
  rocket,
  sailboat,
  tent,
  mountain,
  sparkles,
  smile,
  users,
  cake,
};
