import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardEdit,
  FileCog,
  Globe,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  Network,
  Radio,
  Settings,
  Settings2,
  Shield,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const operadorItems = [
  { title: "Status das ETEs", url: "/operador", icon: Activity },
  { title: "Cadastro de ETEs", url: "/operador/etes", icon: Building2 },
  { title: "Cadastro Manual", url: "/operador/cadastro", icon: ClipboardEdit },
  { title: "Monitoramento API", url: "/operador/api", icon: Radio },
  { title: "Log de Integração", url: "/operador/logs", icon: Settings },
];

const anaItems = [
  { title: "Centro de Comando", url: "/command-center", icon: LayoutDashboard },
  { title: "Tendência DBO", url: "/command-center/tendencia", icon: TrendingUp },
  { title: "Mapa Interativo", url: "/command-center/mapa", icon: Globe },
  { title: "Alertas DBO", url: "/command-center/alertas", icon: AlertTriangle },
  { title: "Conformidade", url: "/command-center/conformidade", icon: Shield },
];

const agenciaItems = [
  { title: "Painel da Agência", url: "/agencia", icon: Gavel },
];

const adminItems = [
  { title: "Hub de Administração", url: "/admin", icon: LayoutGrid },
  { title: "Usuários & Roles", url: "/admin/usuarios", icon: Users },
  { title: "Concessionárias", url: "/admin/concessionarias", icon: Building2 },
  { title: "Agências Reguladoras", url: "/admin/agencias", icon: Gavel },
  { title: "Configuração LDAP", url: "/admin/ldap", icon: Network },
  { title: "Configuração SMTP", url: "/admin/smtp", icon: Mail },
  { title: "Integração SEI", url: "/admin/sei", icon: FileCog },
  { title: "Parâmetros Gerais", url: "/admin/parametros", icon: Settings2 },
  { title: "Auditoria & Segurança", url: "/admin/auditoria", icon: ShieldCheck },
];

interface NavDropdownProps {
  label: string;
  items: typeof operadorItems;
  currentPath: string;
}

function NavDropdown({ label, items, currentPath }: NavDropdownProps) {
  const isGroupActive = items.some((i) => currentPath === i.url);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            isGroupActive
              ? "bg-[hsl(var(--nav-active))] text-white"
              : "text-[hsl(var(--nav-muted))] hover:text-white hover:bg-white/10"
          )}
        >
          {label}
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        {items.map((item) => (
          <DropdownMenuItem key={item.url} asChild>
            <Link
              to={item.url}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                currentPath === item.url && "font-medium text-primary"
              )}
            >
              <item.icon className="size-4" />
              {item.title}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopNavbar() {
  const { user, profile, roles, signOut, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleLabels: Record<string, string> = {
    operador: "Operador",
    gestor_ana: "Gestor ANA",
    superadmin: "Super Admin",
  };

  return (
    <nav className="h-14 bg-[hsl(var(--nav-bg))] border-b border-white/10 flex items-center px-4 lg:px-6 sticky top-0 z-50">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mr-8 shrink-0">
        <div className="size-8 bg-[hsl(var(--nav-active))] rounded-lg flex items-center justify-center">
          <BarChart3 className="size-4 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight hidden sm:block">
          HydrosNet
        </span>
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-1">
        <NavDropdown label="Operador B2B" items={operadorItems} currentPath={location.pathname} />
        <NavDropdown label="Centro de Comando ANA" items={anaItems} currentPath={location.pathname} />
        {isSuperAdmin && (
          <NavDropdown label="Administração" items={adminItems} currentPath={location.pathname} />
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2">
          <div className="size-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
          <span className="text-xs font-mono text-[hsl(var(--nav-muted))]">ONLINE</span>
        </div>

        {roles.map((role) => (
          <Badge
            key={role}
            className={cn(
              "text-[10px] font-mono hidden md:flex",
              role === "superadmin"
                ? "bg-[hsl(var(--nav-active))] text-white border-transparent"
                : "bg-white/10 text-white/80 border-transparent"
            )}
          >
            {role === "superadmin" && <Shield className="size-3 mr-1" />}
            {roleLabels[role] || role}
          </Badge>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-white hover:bg-white/10">
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

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-white hover:bg-white/10 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute top-14 left-0 right-0 bg-[hsl(var(--nav-bg))] border-b border-white/10 p-4 md:hidden z-50">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-[hsl(var(--nav-muted))] mb-2">Operador B2B</p>
            {operadorItems.map((item) => (
              <Link
                key={item.url}
                to={item.url}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                  location.pathname === item.url
                    ? "bg-[hsl(var(--nav-active))] text-white"
                    : "text-[hsl(var(--nav-muted))] hover:text-white"
                )}
              >
                <item.icon className="size-4" />
                {item.title}
              </Link>
            ))}
            <p className="text-xs font-semibold uppercase text-[hsl(var(--nav-muted))] mb-2 mt-4">Centro de Comando ANA</p>
            {anaItems.map((item) => (
              <Link
                key={item.url}
                to={item.url}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                  location.pathname === item.url
                    ? "bg-[hsl(var(--nav-active))] text-white"
                    : "text-[hsl(var(--nav-muted))] hover:text-white"
                )}
              >
                <item.icon className="size-4" />
                {item.title}
              </Link>
            ))}
            {isSuperAdmin && (
              <>
                <p className="text-xs font-semibold uppercase text-[hsl(var(--nav-muted))] mb-2 mt-4">Administração</p>
                {adminItems.map((item) => (
                  <Link
                    key={item.url}
                    to={item.url}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                      location.pathname === item.url
                        ? "bg-[hsl(var(--nav-active))] text-white"
                        : "text-[hsl(var(--nav-muted))] hover:text-white"
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.title}
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
