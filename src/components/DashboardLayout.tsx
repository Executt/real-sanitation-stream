import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardLayout() {
  const { user, profile, roles, signOut, isSuperAdmin } = useAuth();

  const roleLabels: Record<string, string> = {
    operador: "Operador",
    gestor_ana: "Gestor ANA",
    superadmin: "Super Admin",
  };

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

              {roles.map((role) => (
                <Badge key={role} variant={role === "superadmin" ? "default" : "secondary"} className="text-[10px] font-mono">
                  {role === "superadmin" && <Shield className="size-3 mr-1" />}
                  {roleLabels[role] || role}
                </Badge>
              ))}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <User className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">{profile?.full_name || "Usuário"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="size-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
