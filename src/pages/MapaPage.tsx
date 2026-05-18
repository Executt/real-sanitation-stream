import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EteMap } from "@/components/EteMap";

export default function MapaPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Mapa Interativo</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Visualização geoespacial detalhada das ETEs cadastradas no Brasil.
        </p>
      </div>
      <ErrorBoundary
        section="Mapa Geoespacial"
        title="Mapa indisponível no momento"
        description="Não foi possível renderizar o mapa geoespacial das ETEs."
      >
        <EteMap />
      </ErrorBoundary>
    </div>
  );
}
