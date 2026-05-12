import { useState } from "react";
import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSidebar } from "@/components/ui/sidebar";

const bacias = [
  "Todas as bacias",
  "Bacia do Tietê",
  "Bacia do São Francisco",
  "Bacia do Paraná",
  "Bacia do Amazonas",
  "Bacia do Paraguai",
  "Bacia Atlântico Sudeste",
];

const statuses = [
  { value: "todos", label: "Todos os status" },
  { value: "ativa", label: "Ativa" },
  { value: "em_construcao", label: "Em construção" },
  { value: "inativa", label: "Inativa" },
];

const periodos = [
  { value: "24h", label: "Últimas 24h" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "12m", label: "Últimos 12 meses" },
];

export function SidebarFilters() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [bacia, setBacia] = useState(bacias[0]);
  const [status, setStatus] = useState("todos");
  const [periodo, setPeriodo] = useState("30d");

  if (collapsed) {
    return (
      <div className="px-2 py-2 flex justify-center">
        <Filter className="size-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-3 py-2 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Filter className="size-3.5" />
        Filtros
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] font-mono uppercase text-muted-foreground">Bacia</label>
          <Select value={bacia} onValueChange={setBacia}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bacias.map((b) => (
                <SelectItem key={b} value={b} className="text-xs">
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase text-muted-foreground">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase text-muted-foreground">Período</label>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodos.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
