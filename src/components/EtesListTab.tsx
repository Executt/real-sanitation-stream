import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { SortHeader } from "@/components/SortHeader";

interface Ete {
  id: string;
  codigo: string | null;
  nome: string;
  municipio: string;
  uf: string;
  status: string;
  vazao_atual_lps: number | null;
  populacao_atendida: number | null;
}

interface Props {
  /** ids das concessionárias cujos ETEs devem ser listados */
  concessionariaIds: string[];
}

const STATUSES = ["all", "operacional", "manutencao", "inativa", "alerta"];
type ESortKey = "codigo" | "nome" | "municipio" | "status" | "vazao_atual_lps" | "populacao_atendida";

export function EtesListTab({ concessionariaIds }: Props) {
  const [rows, setRows] = useState<Ete[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<{ key: ESortKey; dir: "asc" | "desc" }>({ key: "nome", dir: "asc" });

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!concessionariaIds.length) {
      setRows([]); setTotal(0); setLoading(false); return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let q = supabase
        .from("etes")
        .select("id, codigo, nome, municipio, uf, status, vazao_atual_lps, populacao_atendida", { count: "exact" })
        .in("concessionaria_id", concessionariaIds)
        .order(sort.key, { ascending: sort.dir === "asc" })
        .range(from, to);
      if (status !== "all") q = q.eq("status", status);
      if (debounced) q = q.or(`municipio.ilike.%${debounced}%,nome.ilike.%${debounced}%,codigo.ilike.%${debounced}%`);
      const { data, count } = await q;
      if (cancelled) return;
      setRows((data ?? []) as Ete[]);
      setTotal(count ?? 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [concessionariaIds.join(","), debounced, status, page, pageSize, sort.key, sort.dir]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const toggleSort = (k: ESortKey) => {
    setPage(1);
    setSort((s) => s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por município, nome ou código"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "Todos status" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader<ESortKey> label="Código" sortKey="codigo" currentKey={sort.key} dir={sort.dir} onClick={toggleSort} />
              <SortHeader<ESortKey> label="Nome" sortKey="nome" currentKey={sort.key} dir={sort.dir} onClick={toggleSort} />
              <SortHeader<ESortKey> label="Município/UF" sortKey="municipio" currentKey={sort.key} dir={sort.dir} onClick={toggleSort} />
              <SortHeader<ESortKey> label="Status" sortKey="status" currentKey={sort.key} dir={sort.dir} onClick={toggleSort} />
              <SortHeader<ESortKey> label="Vazão (L/s)" sortKey="vazao_atual_lps" currentKey={sort.key} dir={sort.dir} onClick={toggleSort} align="right" />
              <SortHeader<ESortKey> label="População" sortKey="populacao_atendida" currentKey={sort.key} dir={sort.dir} onClick={toggleSort} align="right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma ETE encontrada</TableCell></TableRow>
            ) : rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.codigo ?? "—"}</TableCell>
                <TableCell className="font-medium">{e.nome}</TableCell>
                <TableCell className="text-xs">{e.municipio}/{e.uf}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] capitalize">{(e.status ?? "—").replace("_", " ")}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{e.vazao_atual_lps ?? "—"}</TableCell>
                <TableCell className="text-right font-mono text-xs">{e.populacao_atendida?.toLocaleString("pt-BR") ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination page={page} pageCount={pageCount} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </div>
    </div>
  );
}
