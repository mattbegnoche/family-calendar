import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** The household tile at the top of the sidebar sets the pattern; every row reuses it. */
const ICON_TILE =
  "flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg transition-colors";

export interface NavIconProps {
  icon: LucideIcon;
  isActive: boolean;
  /**
   * CSS background-image for the active tile — the household's own gradient,
   * from householdTileGradient, so the page icons match the family colour
   * chosen in Settings rather than a fixed indigo.
   */
  activeGradient?: string;
}

export function NavIcon({ icon: Icon, isActive, activeGradient }: NavIconProps) {
  const style: CSSProperties | undefined =
    isActive && activeGradient ? { backgroundImage: activeGradient } : undefined;

  return (
    <span
      className={cn(
        ICON_TILE,
        isActive
          ? "text-white shadow-sm"
          : "bg-sidebar-accent/60 text-sidebar-foreground/80",
        // Fallback ramp for callers that pass no gradient.
        isActive && !activeGradient && "bg-linear-to-br from-[#4f46e5] to-[#7c3aed]",
      )}
      style={style}
    >
      {/* size-5! because sidebarMenuButtonVariants forces [&_svg]:size-4. */}
      <Icon className="size-5!" />
    </span>
  );
}
