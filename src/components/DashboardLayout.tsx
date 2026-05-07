import { Outlet } from "react-router-dom";
import { TopNavbar } from "@/components/TopNavbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function DashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary
        section="Navegação"
        title="Navegação indisponível"
        description="Não foi possível renderizar a barra de navegação. O conteúdo da página continua acessível."
      >
        <TopNavbar />
      </ErrorBoundary>
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
