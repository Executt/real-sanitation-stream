import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b px-4 bg-card">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-3">
              <div className="size-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-mono text-muted-foreground">SISTEMA OPERACIONAL</span>
            </div>
          </header>
          <main className="flex-1 p-6 lg:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
