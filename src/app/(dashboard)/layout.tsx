import { ReactNode } from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { DashboardBreadcrumb } from "@/components/DashboardBreadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
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
