import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusConfig = {
  ativa: { label: "Ativa", variant: "default" as const, className: "bg-success/10 text-success border-success/30" },
  construcao: { label: "Em construção", variant: "secondary" as const, className: "bg-warning/10 text-warning border-warning/30" },
  inativa: { label: "Inativa", variant: "destructive" as const, className: "bg-destructive/10 text-destructive border-destructive/30" },
};

interface Ete {
  codigo: string;
  nome: string;
  municipio: string;
  tipologia: string;
  status: "ativa" | "construcao" | "inativa";
  eficienciaDBO: number;
  integracaoAPI: "ok" | "falha" | "manual";
  ultimaAtualizacao: string;
}

const mockEtes: Ete[] = [
  { codigo: "ETE-SP-0042", nome: "ETE Barueri", municipio: "Barueri - SP", tipologia: "Lodos Ativados", status: "ativa", eficienciaDBO: 94.2, integracaoAPI: "ok", ultimaAtualizacao: "há 5 min" },
  { codigo: "ETE-SP-0108", nome: "ETE ABC", municipio: "Santo André - SP", tipologia: "UASB + Filtro", status: "ativa", eficienciaDBO: 88.7, integracaoAPI: "ok", ultimaAtualizacao: "há 12 min" },
  { codigo: "ETE-MG-0231", nome: "ETE Arrudas", municipio: "Belo Horizonte - MG", tipologia: "UASB", status: "ativa", eficienciaDBO: 71.3, integracaoAPI: "falha", ultimaAtualizacao: "há 2h" },
  { codigo: "ETE-RJ-0015", nome: "ETE Alegria", municipio: "Rio de Janeiro - RJ", tipologia: "Lodos Ativados", status: "construcao", eficienciaDBO: 0, integracaoAPI: "manual", ultimaAtualizacao: "há 30 dias" },
  { codigo: "ETE-BA-0087", nome: "ETE Jaguaribe", municipio: "Salvador - BA", tipologia: "Lagoa Facultativa", status: "inativa", eficienciaDBO: 0, integracaoAPI: "manual", ultimaAtualizacao: "há 90 dias" },
  { codigo: "ETE-PR-0044", nome: "ETE Belém", municipio: "Curitiba - PR", tipologia: "UASB + Lodos Ativados", status: "ativa", eficienciaDBO: 92.1, integracaoAPI: "ok", ultimaAtualizacao: "há 3 min" },
  { codigo: "ETE-RS-0019", nome: "ETE São João", municipio: "Porto Alegre - RS", tipologia: "Lodos Ativados", status: "ativa", eficienciaDBO: 89.5, integracaoAPI: "ok", ultimaAtualizacao: "há 8 min" },
  { codigo: "ETE-CE-0055", nome: "ETE Coc\u00f3", municipio: "Fortaleza - CE", tipologia: "Lagoa Anaeróbia", status: "ativa", eficienciaDBO: 67.8, integracaoAPI: "falha", ultimaAtualizacao: "há 6h" },
];

const apiConfig = {
  ok: { label: "Automático", className: "bg-success/10 text-success border-success/30" },
  falha: { label: "Falha API", className: "bg-destructive/10 text-destructive border-destructive/30" },
  manual: { label: "Manual", className: "bg-muted text-muted-foreground border-muted" },
};

export function EteStatusTable() {
  return (
    <div className="bg-card border rounded-sm shadow-sm overflow-hidden">
      <div className="p-5 border-b">
        <h2 className="font-semibold">Status das ETEs — Integração</h2>
        <p className="text-xs text-muted-foreground mt-1">Monitoramento de conectividade e envio de dados</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Código</TableHead>
            <TableHead className="text-xs">Nome</TableHead>
            <TableHead className="text-xs">Município</TableHead>
            <TableHead className="text-xs">Tipologia</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">DBO %</TableHead>
            <TableHead className="text-xs">Integração</TableHead>
            <TableHead className="text-xs">Atualizado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockEtes.map((ete) => {
            const st = statusConfig[ete.status];
            const api = apiConfig[ete.integracaoAPI];
            return (
              <TableRow key={ete.codigo}>
                <TableCell className="font-mono text-xs">{ete.codigo}</TableCell>
                <TableCell className="font-medium text-sm">{ete.nome}</TableCell>
                <TableCell className="text-sm">{ete.municipio}</TableCell>
                <TableCell className="text-xs">{ete.tipologia}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={st.className}>{st.label}</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {ete.eficienciaDBO > 0 ? `${ete.eficienciaDBO}%` : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={api.className}>{api.label}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{ete.ultimaAtualizacao}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
