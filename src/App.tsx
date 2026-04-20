import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import Login from "./pages/Login";
import OperadorDashboard from "./pages/OperadorDashboard";
import CommandCenter from "./pages/CommandCenter";
import CadastroManual from "./pages/CadastroManual";
import Etes from "./pages/Etes";
import AdminHub from "./pages/AdminHub";
import AdminPanel from "./pages/AdminPanel";
import Concessionarias from "./pages/Concessionarias";
import LdapConfig from "./pages/LdapConfig";
import SmtpConfig from "./pages/SmtpConfig";
import SeiConfig from "./pages/SeiConfig";
import SystemParameters from "./pages/SystemParameters";
import AuditLog from "./pages/AuditLog";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<OperadorDashboard />} />
              <Route path="/operador" element={<OperadorDashboard />} />
              <Route path="/operador/etes" element={<Etes />} />
              <Route path="/operador/cadastro" element={<CadastroManual />} />
              <Route
                path="/operador/api"
                element={<PlaceholderPage title="Monitoramento API" description="Painel de monitoramento das integrações de API com sistemas dos operadores." />}
              />
              <Route
                path="/operador/logs"
                element={<PlaceholderPage title="Log de Integração" description="Histórico detalhado de eventos das integrações automáticas." />}
              />
              <Route path="/command-center" element={<CommandCenter />} />
              <Route
                path="/command-center/tendencia"
                element={<PlaceholderPage title="Tendência DBO" description="Análise temporal da eficiência de remoção de DBO por bacia hidrográfica." />}
              />
              <Route
                path="/command-center/mapa"
                element={<PlaceholderPage title="Mapa Interativo" description="Visualização geoespacial detalhada de todas as ETEs cadastradas no Brasil." />}
              />
              <Route
                path="/command-center/alertas"
                element={<PlaceholderPage title="Alertas DBO" description="Centro de alertas críticos de não-conformidade de DBO por região." />}
              />
              <Route
                path="/command-center/conformidade"
                element={<PlaceholderPage title="Conformidade" description="Relatórios de conformidade regulatória junto à ANA." />}
              />
              {/* Administração — Hub e módulos */}
              <Route path="/admin" element={<AdminHub />} />
              <Route path="/admin/usuarios" element={<AdminPanel />} />
              <Route path="/admin/concessionarias" element={<Concessionarias />} />
              <Route path="/admin/ldap" element={<LdapConfig />} />
              <Route path="/admin/smtp" element={<SmtpConfig />} />
              <Route path="/admin/sei" element={<SeiConfig />} />
              <Route path="/admin/parametros" element={<SystemParameters />} />
              <Route path="/admin/auditoria" element={<AuditLog />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
