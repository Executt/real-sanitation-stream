import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DboTrendChart } from "@/components/DboTrendChart";

export default function TendenciaPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Tendência DBO</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Análise temporal da eficiência de remoção de DBO por bacia hidrográfica.
        </p>
      </div>
      <ErrorBoundary
        section="Tendência DBO"
        title="Gráfico indisponível"
        description="Não foi possível renderizar a evolução de DBO por bacia."
      >
        <DboTrendChart />
      </ErrorBoundary>
    </div>
  );
}
