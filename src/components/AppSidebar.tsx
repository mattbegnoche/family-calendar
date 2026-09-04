"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, LogOut, Settings } from "lucide-react";

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

// TODO: replace with Household.name once the household models come back.
const HOUSEHOLD_NAME = "Begnoche Family";

const PEOPLE = FAMILY_MEMBERS.filter((member) => member.id !== SHARED_MEMBER_ID);

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={HOUSEHOLD_NAME}>
              {/* Same indigo-to-violet ramp as the favicon and the primary token. */}
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-[#4f46e5] to-[#7c3aed] text-white">
                <Calendar className="size-4" />
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
                    render={<Link href={item.href} />}
                    isActive={isNavItemActive(item, pathname)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              isActive={pathname.startsWith("/settings")}
              tooltip="Settings"
            >
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOutUser()} tooltip="Sign out">
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* The thin strip along the edge that toggles the sidebar. */}
      <SidebarRail />
    </Sidebar>
  );
}
