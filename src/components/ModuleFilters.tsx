import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrg } from "@/contexts/OrgContext";
import { ORG_TYPE_LABEL } from "@/types/governance";

interface Props {
  orgId: string;
  onOrgId: (v: string) => void;
  uf: string;
  onUf: (v: string) => void;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export function ModuleFilters({
  orgId, onOrgId, uf, onUf, search, onSearch, searchPlaceholder = "Buscar por município...", children,
}: Props) {
  const { flat, loading } = useOrg();

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={searchPlaceholder}
        className="h-9 w-[240px]"
      />
      <Select value={orgId} onValueChange={onOrgId}>
        <SelectTrigger className="h-9 w-[280px]">
          <SelectValue placeholder={loading ? "Carregando..." : "Todas as organizações"} />
        </SelectTrigger>
        <SelectContent className="max-h-[320px]">
          <SelectItem value="all">Todas as organizações</SelectItem>
          {flat.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              <span style={{ paddingLeft: o.level * 12 }}>
                {o.sigla ? `${o.sigla} — ` : ""}{o.name}
                <span className="text-muted-foreground text-xs"> ({ORG_TYPE_LABEL[o.type]})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={uf} onValueChange={onUf}>
        <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="UF" /></SelectTrigger>
        <SelectContent className="max-h-[320px]">
          <SelectItem value="all">Todas UF</SelectItem>
          {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
        </SelectContent>
      </Select>
      {children}
    </div>
  );
}
