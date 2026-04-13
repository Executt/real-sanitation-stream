import { StatCard } from "@/components/StatCard";
import { AlertItem } from "@/components/AlertItem";
import { DboTrendChart } from "@/components/DboTrendChart";
import { Badge } from "@/components/ui/badge";
import { Globe, TrendingDown, TrendingUp } from "lucide-react";

const bacias = [
  { nome: "Bacia do Tietê", etes: 342, cobertura: 78.3, eficiencia: 89.1, trend: "up" as const },
  { nome: "Bacia do São Francisco", etes: 187, cobertura: 52.1, eficiencia: 72.4, trend: "down" as const },
  { nome: "Bacia do Paraná", etes: 456, cobertura: 84.7, eficiencia: 91.3, trend: "up" as const },
  { nome: "Bacia do Amazonas", etes: 89, cobertura: 23.8, eficiencia: 58.9, trend: "down" as const },
  { nome: "Bacia do Paraguai", etes: 124, cobertura: 61.2, eficiencia: 79.6, trend: "up" as const },
  { nome: "Bacia Atlântico Sudeste", etes: 298, cobertura: 71.9, eficiencia: 85.2, trend: "up" as const },
];

export default function CommandCenter() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Centro de Comando ANA</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            VISÃO NACIONAL | 3.668 ETEs MONITORADAS
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="size-2 rounded-full bg-success animate-pulse" />
          <span className="bg-card px-4 py-2 border rounded-sm text-sm font-mono text-muted-foreground">
            Tempo Real — {new Date().toLocaleTimeString("pt-BR")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="ETEs Ativas" value="3.241" subtitle="88.3% do total cadastrado" variant="success" progress={88.3} />
        <StatCard label="ETEs em Construção" value="198" variant="warning" />
        <StatCard label="ETEs Inativas" value="229" subtitle="Requer atenção regulatória" variant="destructive" />
        <StatCard label="Eficiência DBO Nacional" value="82.1%" subtitle="+1.3% vs trimestre anterior" variant="default" progress={82.1} />
      </div>

      {/* DBO Trend Chart */}
      <div className="mb-8">
        <DboTrendChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-card border rounded-sm shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Monitoramento Geoespacial</h2>
            <Badge variant="outline" className="font-mono text-xs">SNIRH INTEGRADO</Badge>
          </div>
          <div className="bg-muted rounded-sm aspect-video flex flex-col items-center justify-center gap-3">
            <Globe className="size-12 text-muted-foreground/50" />
            <p className="text-muted-foreground font-mono text-sm">MAPA INTERATIVO — LEAFLET / MAPBOX</p>
            <p className="text-xs text-muted-foreground">Integração geoespacial com PostGIS e camadas SNIRH</p>
          </div>
        </div>

        <div className="bg-card border rounded-sm shadow-sm p-5">
          <h2 className="font-semibold mb-4">Alertas Nacionais</h2>
          <AlertItem title="ETE Piracicaba" description="Excesso de carga orgânica — DBO 120mg/L (limiar: 60mg/L)" severity="critical" time="há 2 min" />
          <AlertItem title="Bacia Amazonas" description="Cobertura abaixo de 25% — risco sanitário elevado" severity="critical" time="há 15 min" />
          <AlertItem title="Bacia São Francisco" description="Eficiência DBO em queda: -3.2% no último mês" severity="warning" time="há 1 hora" />
          <AlertItem title="Hub IoT Região Sul" description="12 sensores desconectados no cluster PR-042" severity="warning" time="há 3 horas" />
          <AlertItem title="API Gateway" description="Rate limit atingido por 2 concessionárias (429)" severity="info" time="há 6 horas" />
        </div>
      </div>

      <div className="bg-card border rounded-sm shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Indicadores por Bacia Hidrográfica</h2>
          <p className="text-xs text-muted-foreground mt-1">Cobertura de esgotamento e eficiência de tratamento</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {bacias.map((bacia) => (
            <div key={bacia.nome} className="p-5 border-b border-r last:border-r-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">{bacia.nome}</h3>
                {bacia.trend === "up" ? (
                  <TrendingUp className="size-4 text-success" />
                ) : (
                  <TrendingDown className="size-4 text-destructive" />
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xl font-semibold">{bacia.etes}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">ETEs</p>
                </div>
                <div>
                  <p className="text-xl font-semibold">{bacia.cobertura}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Cobertura</p>
                </div>
                <div>
                  <p className="text-xl font-semibold">{bacia.eficiencia}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Efic. DBO</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${bacia.cobertura}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
