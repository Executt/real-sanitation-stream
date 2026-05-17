import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConformidadeCard } from "@/components/ConformidadeCard";

export default function ConformidadePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Conformidade DBO Nacional</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Relatórios de conformidade regulatória junto à ANA — últimos 30 dias.
        </p>
      </div>
      <ErrorBoundary
        section="Conformidade DBO"
        title="Conformidade indisponível"
        description="Não foi possível calcular o percentual de conformidade DBO."
      >
        <ConformidadeCard />
      </ErrorBoundary>
    </div>
  );
}
