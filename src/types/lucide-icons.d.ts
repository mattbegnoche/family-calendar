/**
 * lucide-react ships no `exports` map and no declarations for its per-icon
 * modules, so the raw `__iconNode` data is untyped without this.
 *
 * src/lib/household-icon-nodes.ts explains why that data is imported at all:
 * the Lucide components go through a "use client" module, so they cannot be
 * called on the server while generating the favicon.
 */
declare module "lucide-react/dist/esm/icons/*.mjs" {
  /** Tuples of [svgTagName, attributes], e.g. ["path", { d: "M15 21v-8…" }]. */
  export const __iconNode: readonly (readonly [
    string,
    Record<string, unknown>,
  ])[];
}
