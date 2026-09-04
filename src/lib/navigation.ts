import { Calendar, ListTodo, type LucideIcon } from "lucide-react";

/**
 * The sidebar's main links. Single source of truth: the sidebar renders these,
 * and the header breadcrumb resolves the current page title from the same list,
 * so adding a section is a one-line change here.
 */
export interface NavItem {
  readonly title: string;
  readonly href: string;
  readonly icon: LucideIcon;
}

export const MAIN_NAV: readonly NavItem[] = [
  { title: "Calendar", href: "/calendar", icon: Calendar },

  { title: "Tasks", href: "/tasks", icon: ListTodo },
];

/** Matches the item itself and anything nested under it (/calendar/2026-09). */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function navTitleFor(pathname: string): string | undefined {
  return MAIN_NAV.find((item) => isNavItemActive(item, pathname))?.title;
}
