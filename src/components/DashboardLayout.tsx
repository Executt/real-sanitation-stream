import { Outlet } from "react-router-dom";
import { TopNavbar } from "@/components/TopNavbar";

export function DashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNavbar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
