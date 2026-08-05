import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrg } from "@/contexts/OrgContext";
import { ORG_TYPE_LABEL } from "@/types/governance";
import type { HierarchyFilter } from "@/lib/useHierarchyFilter";
import { FilterX, Network } from "lucide-react";

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

interface Props {
  filter: HierarchyFilter;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

/**
 * Filtros hierárquicos em cascata: UF → Município → Organização (+ concessionárias filhas).
 * Compartilhado por Esgotamento, Mananciais, Distribuição/Perdas, ISH-U e Investimentos.
 */
export function HierarchyFilters({ filter, searchPlaceholder = "Buscar por município...", children }: Props) {
  const { flat, loading } = useOrg();
  const { value, set, reset, orgIds } = filter;

  const ufOptions = useMemo(() => {
    const fromOrgs = new Set(flat.map((o) => o.uf).filter(Boolean) as string[]);
    return Array.from(new Set([...fromOrgs, ...UFS])).sort();
  }, [flat]);

  const municipios = useMemo(() => {
    const scoped = flat.filter((o) => (value.uf === "all" || o.uf === value.uf) && o.municipio);
    return Array.from(new Set(scoped.map((o) => o.municipio as string))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [flat, value.uf]);

  const orgOptions = useMemo(
    () =>
      flat.filter(
        (o) =>
          (value.uf === "all" || o.uf === value.uf || o.uf === null) &&
          (value.municipio === "all" || o.municipio === value.municipio || o.municipio === null),
      ),
    [flat, value.uf, value.municipio],
  );

  const selected = flat.find((o) => o.id === value.orgId);
  const dirty = value.uf !== "all" || value.municipio !== "all" || value.orgId !== "all" || !!value.search;

  return (
    <div className="bg-card border rounded-sm p-4 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Label className="text-xs text-muted-foreground">Busca</Label>
          <Input
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder={searchPlaceholder}
            className="h-9 mt-1"
            disabled={value.municipio !== "all"}
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">UF</Label>
          <Select value={value.uf} onValueChange={(v) => set({ uf: v })}>
            <SelectTrigger className="h-9 w-[110px] mt-1"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[320px]">
              <SelectItem value="all">Todas</SelectItem>
              {ufOptions.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Município</Label>
          <Select value={value.municipio} onValueChange={(v) => set({ municipio: v })}>
            <SelectTrigger className="h-9 w-[210px] mt-1">
              <SelectValue placeholder={municipios.length ? "Todos" : "Sem municípios"} />
            </SelectTrigger>
            <SelectContent className="max-h-[320px]">
              <SelectItem value="all">Todos os municípios</SelectItem>
              {municipios.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Organização</Label>
          <Select value={value.orgId} onValueChange={(v) => set({ orgId: v })}>
            <SelectTrigger className="h-9 w-[300px] mt-1">
              <SelectValue placeholder={loading ? "Carregando..." : "Todas as organizações"} />
            </SelectTrigger>
            <SelectContent className="max-h-[320px]">
              <SelectItem value="all">Todas as organizações</SelectItem>
              {orgOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  <span style={{ paddingLeft: o.level * 12 }}>
                    {o.sigla ? `${o.sigla} — ` : ""}{o.name}
                    <span className="text-muted-foreground text-xs"> ({ORG_TYPE_LABEL[o.type]})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 h-9">
          <Switch
            id="incluir-filhas"
            checked={value.includeChildren}
            onCheckedChange={(c) => set({ includeChildren: c })}
            disabled={value.orgId === "all"}
          />
          <Label htmlFor="incluir-filhas" className="text-xs">Incluir concessionárias filhas</Label>
        </div>

        {children}

        {dirty && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-9">
            <FilterX className="size-4 mr-1.5" /> Limpar
          </Button>
        )}
      </div>

      {selected && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Network className="size-3.5" />
          Escopo: <Badge variant="outline" className="font-mono">{selected.sigla || selected.name}</Badge>
          {value.includeChildren && orgIds && orgIds.length > 1 && (
            <span>+ {orgIds.length - 1} organização(ões) subordinada(s)</span>
          )}
        </div>
      )}
    </div>
  );
}
