import { useEffect, useState } from "react";
import { Filter, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";

interface Option {
  value: string;
  label: string;
}

interface FilterOptions {
  bacias: Option[];
  statuses: Option[];
  periodos: Option[];
}

const STATIC_BACIAS: Option[] = [
  { value: "todas", label: "Todas as bacias" },
  { value: "tiete", label: "Bacia do Tietê" },
  { value: "sao_francisco", label: "Bacia do São Francisco" },
  { value: "parana", label: "Bacia do Paraná" },
  { value: "amazonas", label: "Bacia do Amazonas" },
  { value: "paraguai", label: "Bacia do Paraguai" },
  { value: "atlantico_sudeste", label: "Bacia Atlântico Sudeste" },
];

const STATUS_LABELS: Record<string, string> = {
  ativa: "Ativa",
  em_construcao: "Em construção",
  inativa: "Inativa",
};

const STATIC_PERIODOS: Option[] = [
  { value: "24h", label: "Últimas 24h" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "12m", label: "Últimos 12 meses" },
];

async function fetchFilterOptions(): Promise<FilterOptions> {
  const { data, error } = await supabase.from("etes").select("status");
  if (error) {
    throw new Error(`Falha ao carregar opções de filtro: ${error.message}`);
  }

  const distinctStatuses = Array.from(new Set((data ?? []).map((r) => r.status))).filter(Boolean);
  const statuses: Option[] = [
    { value: "todos", label: "Todos os status" },
    ...distinctStatuses.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s })),
  ];

  return { bacias: STATIC_BACIAS, statuses, periodos: STATIC_PERIODOS };
}

export function SidebarFilters() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  const [bacia, setBacia] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [periodo, setPeriodo] = useState("30d");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    fetchFilterOptions()
      .then((opts) => {
        if (!cancelled) setOptions(opts);
      })
      .catch((err: Error) => {
        if (!cancelled) setFetchError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Propagate to ErrorBoundary so the standard "Tentar novamente" remounts and refetches.
  if (fetchError) throw fetchError;

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
        {loading && <Loader2 className="size-3 animate-spin ml-auto" />}
      </div>

      <div className="space-y-2">
        <FilterField
          label="Bacia"
          value={bacia}
          onChange={setBacia}
          options={options?.bacias}
          loading={loading}
        />
        <FilterField
          label="Status"
          value={status}
          onChange={setStatus}
          options={options?.statuses}
          loading={loading}
        />
        <FilterField
          label="Período"
          value={periodo}
          onChange={setPeriodo}
          options={options?.periodos}
          loading={loading}
        />
      </div>
    </div>
  );
}

interface FilterFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: Option[];
  loading: boolean;
}

function FilterField({ label, value, onChange, options, loading }: FilterFieldProps) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase text-muted-foreground">{label}</label>
      {loading || !options ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
