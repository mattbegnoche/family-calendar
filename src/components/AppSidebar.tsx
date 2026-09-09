"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings } from "lucide-react";

import { NavIcon } from "@/components/NavIcon";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { signOutUser } from "@/app/actions/auth";
import { HouseholdGlyph, householdTileGradient } from "@/lib/household-icons";
import { MAIN_NAV, isNavItemActive } from "@/lib/navigation";

export interface SignedInUser {
  name: string | null;
  email: string | null;
  image: string | null;
}

const AVATAR_PIXELS = 32;

/** Falls back to initials when Google has no photo for the account. */
function initialsOf(user: SignedInUser): string {
  const source = user.name ?? user.email ?? "?";
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export interface SidebarMember {
  id: string;
  name: string;
  color: string;
  isShared: boolean;
}

export interface AppSidebarProps {
  user: SignedInUser;
  householdName: string;
  /** 6-digit hex. Tints the tile below and its gradient. */
  householdColor: string;
  /** A key into HOUSEHOLD_ICONS; an unknown value falls back to the default. */
  householdIconKey: string;
  members: readonly SidebarMember[];
}

export function AppSidebar({
  user,
  householdName,
  householdColor,
  householdIconKey,
  members,
}: AppSidebarProps) {
  const pathname = usePathname();
  // The shared "Household" row is not a person, so it does not get a dot.
  const people = members.filter((member) => !member.isShared);
  // Active page icons wear the same gradient as the household tile.
  const activeGradient = householdTileGradient(householdColor);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Links to settings: the tile is where people look to change the
                family's name, colour and icon, so it is where the edit lives. */}
            <SidebarMenuButton
              size="lg"
              render={<Link href="/settings" />}
              tooltip={householdName}
            >
              <div
                className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundImage: householdTileGradient(householdColor) }}
              >
                <HouseholdGlyph iconKey={householdIconKey} className="size-5!" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">{householdName}</span>
                <span className="flex items-center gap-1 text-xs text-sidebar-foreground/60">
                  {people.map((member) => (
                    <span
                      key={member.id}
                      title={member.name}
                      className="size-2 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                  ))}
                  <span className="ml-0.5">{people.length} members</span>
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Household</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN_NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    size="lg"
                    render={<Link href={item.href} />}
                    isActive={isNavItemActive(item, pathname)}
                    tooltip={item.title}
                  >
                    <NavIcon
                      icon={item.icon}
                      isActive={isNavItemActive(item, pathname)}
                      activeGradient={activeGradient}
                    />
                    <span className="font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {/* Who is signed in — the two adults share a wall display, so this
              needs to be unambiguous at a glance. */}
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={user.name ?? user.email ?? "Signed in"}
              className="cursor-default hover:bg-transparent"
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt=""
                  width={AVATAR_PIXELS}
                  height={AVATAR_PIXELS}
                  className="size-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium">
                  {initialsOf(user)}
                </span>
              )}
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">
                  {user.name ?? "Signed in"}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {user.email}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <ThemeToggle />

          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/settings" />}
              isActive={pathname.startsWith("/settings")}
              tooltip="Settings"
            >
              <NavIcon
                icon={Settings}
                isActive={pathname.startsWith("/settings")}
                activeGradient={activeGradient}
              />
              <span className="font-medium">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => signOutUser()}
              tooltip="Sign out"
            >
              <NavIcon icon={LogOut} isActive={false} />
              <span className="font-medium">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* The thin strip along the edge that toggles the sidebar. */}
      <SidebarRail />
    </Sidebar>
  );
}
