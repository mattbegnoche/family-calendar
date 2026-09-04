"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, LogOut, Settings, type LucideIcon } from "lucide-react";

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
import { FAMILY_MEMBERS, SHARED_MEMBER_ID } from "@/lib/family";
import { MAIN_NAV, isNavItemActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// TODO: replace with Household.name once the household models come back.
const HOUSEHOLD_NAME = "Begnoche Family";

const PEOPLE = FAMILY_MEMBERS.filter((member) => member.id !== SHARED_MEMBER_ID);

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

/** The household tile at the top sets the pattern; every row reuses it. */
const ICON_TILE = "flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg transition-colors";
const ACTIVE_TILE = "bg-linear-to-br from-[#4f46e5] to-[#7c3aed] text-white shadow-sm";

function NavIcon({ icon: Icon, isActive }: { icon: LucideIcon; isActive: boolean }) {
  return (
    <span
      className={cn(
        ICON_TILE,
        isActive ? ACTIVE_TILE : "bg-sidebar-accent/60 text-sidebar-foreground/80",
      )}
    >
      {/* size-5! because sidebarMenuButtonVariants forces [&_svg]:size-4. */}
      <Icon className="size-5!" />
    </span>
  );
}

export function AppSidebar({ user }: { user: SignedInUser }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={HOUSEHOLD_NAME}>
              {/* Same indigo-to-violet ramp as the favicon and the primary token. */}
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-[#4f46e5] to-[#7c3aed] text-white">
                <Calendar className="size-5!" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">{HOUSEHOLD_NAME}</span>
                <span className="flex items-center gap-1 text-xs text-sidebar-foreground/60">
                  {PEOPLE.map((member) => (
                    <span
                      key={member.id}
                      title={member.label}
                      className="size-2 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                  ))}
                  <span className="ml-0.5">{PEOPLE.length} members</span>
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

          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/settings" />}
              isActive={pathname.startsWith("/settings")}
              tooltip="Settings"
            >
              <NavIcon icon={Settings} isActive={pathname.startsWith("/settings")} />
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
