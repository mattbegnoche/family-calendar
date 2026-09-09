"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { NavIcon } from "@/components/NavIcon";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useTheme } from "@/components/theme/ThemeProvider";
import { THEME_LABELS, nextThemePreference, type ThemePreference } from "@/lib/theme";

const ICONS: Record<ThemePreference, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

/**
 * One button that cycles System → Light → Dark. A single control rather than
 * three so it still works when the sidebar is collapsed to icons; the
 * tooltip and label say which setting is current.
 */
export function ThemeToggle() {
  const { preference, isReady, setTheme } = useTheme();
  // Until the stored choice is read, show the default rather than guessing;
  // the server rendered the same thing, so hydration stays quiet.
  const shown: ThemePreference = isReady ? preference : "system";
  const label = `${THEME_LABELS[shown]} theme`;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="lg"
        tooltip={label}
        aria-label={`Change theme (currently ${THEME_LABELS[shown].toLowerCase()})`}
        onClick={() => setTheme(nextThemePreference(shown))}
      >
        <NavIcon icon={ICONS[shown]} isActive={false} />
        <span className="font-medium">{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
