import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import AgenciasReguladoras from "./pages/AgenciasReguladoras";
import AgenciaRegDetail from "./pages/AgenciaRegDetail";
import ConcessionariaDetail from "./pages/ConcessionariaDetail";
import AgenciaDashboard from "./pages/AgenciaDashboard";
import LdapConfig from "./pages/LdapConfig";
import SmtpConfig from "./pages/SmtpConfig";
import SeiConfig from "./pages/SeiConfig";
import SystemParameters from "./pages/SystemParameters";
import AuditLog from "./pages/AuditLog";
import ApiMonitoring from "./pages/ApiMonitoring";
import IntegrationLog from "./pages/IntegrationLog";
import AlertasDboPage from "./pages/AlertasDboPage";
import ConformidadePage from "./pages/ConformidadePage";
import TendenciaPage from "./pages/TendenciaPage";
import MapaPage from "./pages/MapaPage";
import CortexPage from "./pages/CortexPage";
import CortexModelos from "./pages/CortexModelos";
import RepositoriosArtefatos from "./pages/RepositoriosArtefatos";
import BasesDados from "./pages/BasesDados";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
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
              <Route path="/operador/api" element={<ApiMonitoring />} />
              <Route path="/operador/logs" element={<IntegrationLog />} />
              <Route path="/command-center" element={<CommandCenter />} />
              <Route path="/command-center/tendencia" element={<TendenciaPage />} />
              <Route path="/command-center/mapa" element={<MapaPage />} />
              <Route path="/command-center/alertas" element={<AlertasDboPage />} />
              <Route path="/command-center/conformidade" element={<ConformidadePage />} />
              <Route path="/command-center/cortex" element={<CortexPage />} />
              {/* Portal da Agência Reguladora */}
              <Route path="/agencia" element={<AgenciaDashboard />} />
              {/* Administração — Hub e módulos */}
              <Route path="/admin" element={<AdminHub />} />
              <Route path="/admin/usuarios" element={<AdminPanel />} />
              <Route path="/admin/concessionarias" element={<Concessionarias />} />
              <Route path="/admin/concessionarias/:id" element={<ConcessionariaDetail />} />
              <Route path="/admin/agencias" element={<AgenciasReguladoras />} />
              <Route path="/admin/agencias/:id" element={<AgenciaRegDetail />} />
              <Route path="/admin/ldap" element={<LdapConfig />} />
              <Route path="/admin/smtp" element={<SmtpConfig />} />
              <Route path="/admin/sei" element={<SeiConfig />} />
              <Route path="/admin/parametros" element={<SystemParameters />} />
              <Route path="/admin/auditoria" element={<AuditLog />} />
              <Route path="/admin/cortex-modelos" element={<CortexModelos />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
