import { StatCard } from "@/components/StatCard";
import { EteStatusTable } from "@/components/EteStatusTable";
import { AlertItem } from "@/components/AlertItem";

export default function OperadorDashboard() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visão Operador B2B</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">SABESP | ID-OP: 4421-A</p>
        </div>
        <div className="bg-card px-4 py-2 border rounded-sm text-sm font-mono text-muted-foreground">
          Sincronizado: {new Date().toLocaleTimeString("pt-BR")}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="ETEs Conectadas" value="147 / 152" subtitle="96.7% com envio automático" variant="default" progress={96.7} />
        <StatCard label="Falhas de API (24h)" value="03" subtitle="Atenção: Latência no Nodo 4" variant="destructive" />
        <StatCard label="Eficiência DBO Média" value="87.4%" subtitle="Acima do limiar regulatório" variant="success" progress={87.4} />
        <StatCard label="Preenchimento Manual" value="05" subtitle="Pendentes de validação" variant="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <EteStatusTable />
        </div>
        <div className="bg-card border rounded-sm shadow-sm p-5">
          <h2 className="font-semibold mb-4">Alertas de Integração</h2>
          <AlertItem title="ETE Arrudas — API Timeout" description="Requisição ao endpoint /vazao retornou 504 após 30s" severity="critical" time="há 2 horas" />
          <AlertItem title="ETE Cocó — Certificado SSL" description="Certificado expira em 7 dias. Renovação necessária." severity="warning" time="há 6 horas" />
          <AlertItem title="Nodo Integrador Sul" description="Latência média subiu para 1.2s (limiar: 500ms)" severity="warning" time="há 12 horas" />
          <AlertItem title="ETE Jaguaribe — Sem Dados" description="Nenhum registro recebido nos últimos 90 dias" severity="critical" time="há 90 dias" />
        </div>
      </div>
    </div>
  );
}
