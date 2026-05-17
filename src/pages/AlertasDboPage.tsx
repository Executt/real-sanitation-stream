import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AlertasDboPanel } from "@/components/AlertasDboPanel";

export default function AlertasDboPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Alertas DBO</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Centro de alertas críticos de não-conformidade de DBO por região.
        </p>
      </div>
      <ErrorBoundary
        section="Alertas DBO"
        title="Alertas indisponíveis"
        description="Não foi possível carregar os alertas de medições DBO fora de conformidade."
      >
        <AlertasDboPanel />
      </ErrorBoundary>
    </div>
  );
}
