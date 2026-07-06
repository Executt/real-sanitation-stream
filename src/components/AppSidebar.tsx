import { Activity, AlertTriangle, BarChart3, Brain, ClipboardEdit, Globe, LayoutDashboard, Radio, Settings, Shield, TrendingUp, Users } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SidebarFilters } from "@/components/SidebarFilters";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

const operadorItems = [
  { title: "Status das ETEs", url: "/operador", icon: Activity },
  { title: "Cadastro Manual", url: "/operador/cadastro", icon: ClipboardEdit },
  { title: "Monitoramento API", url: "/operador/api", icon: Radio },
  { title: "Log de Integração", url: "/operador/logs", icon: Settings },
];

const anaItems = [
  { title: "Command Center", url: "/command-center", icon: LayoutDashboard },
  { title: "Tendência DBO", url: "/command-center/tendencia", icon: TrendingUp },
  { title: "Mapa Interativo", url: "/command-center/mapa", icon: Globe },
  { title: "Alertas DBO", url: "/command-center/alertas", icon: AlertTriangle },
  { title: "Conformidade", url: "/command-center/conformidade", icon: Shield },
  { title: "Córtex IA", url: "/command-center/cortex", icon: Brain },
];

const adminItems = [
  { title: "Usuários & Roles", url: "/admin", icon: Users },
  { title: "Modelos Córtex IA", url: "/admin/cortex-modelos", icon: Brain },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { isSuperAdmin } = useAuth();
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <div className="size-8 bg-primary rounded-sm flex items-center justify-center shrink-0">
            <BarChart3 className="size-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold tracking-tight text-lg">HydrosNet</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Operador B2B
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operadorItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end activeClassName="bg-accent text-primary font-medium">
                      <item.icon className="size-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <ErrorBoundary
          section="Filtros da Sidebar"
          title="Não foi possível carregar os filtros"
          description="Falha ao carregar as opções de bacia, status e período. Tente novamente — o restante da navegação continua disponível."
        >
          <SidebarFilters />
        </ErrorBoundary>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            ANA Center
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {anaItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end activeClassName="bg-accent text-primary font-medium">
                      <item.icon className="size-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} end activeClassName="bg-accent text-primary font-medium">
                        <item.icon className="size-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
