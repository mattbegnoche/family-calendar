import { ReactNode } from "react";

import { auth } from "@/auth";
import { requireHousehold } from "@/lib/household";

import { AppSidebar } from "@/components/AppSidebar";
import { DashboardBreadcrumb } from "@/components/DashboardBreadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // session.user already carries name/email/image from the Google profile —
  // no database round trip needed just to label the sidebar.
  const [session, { household }] = await Promise.all([auth(), requireHousehold()]);
  const signedInUser = {
    name: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  };

  return (
    <SidebarProvider>
      <AppSidebar
        user={signedInUser}
        householdName={household.name}
        members={household.members.map((member) => ({
          id: member.id,
          name: member.name,
          color: member.color,
          isShared: member.kind === "SHARED",
        }))}
      />
      <SidebarInset>
        {/* Fixed-height bar so the page below can own the remaining viewport. */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <DashboardBreadcrumb />
        </header>
        <div className="min-h-0 flex-1 overflow-hidden p-0 sm:p-4 lg:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
