import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMunicipios, useUfs } from "@/lib/useGeo";

interface Props {
  uf: string;
  municipio: string;
  onChange: (v: { uf: string; municipio: string; ibge_code: string | null }) => void;
}

/** Seleção de UF e município a partir da base territorial do IBGE. */
export function GeoPicker({ uf, municipio, onChange }: Props) {
  const { ufs, loading: loadingUf } = useUfs();
  const { municipios, loading: loadingMun } = useMunicipios(uf || null);

  return (
    <div className="grid grid-cols-3 gap-3">
      <div>
        <Label>UF</Label>
        <Select value={uf || undefined} onValueChange={(v) => onChange({ uf: v, municipio: "", ibge_code: null })}>
          <SelectTrigger>
            <SelectValue placeholder={loadingUf ? "Carregando..." : ufs.length ? "UF" : "Sem base IBGE"} />
          </SelectTrigger>
          <SelectContent className="max-h-[320px]">
            {ufs.map((u) => <SelectItem key={u.sigla} value={u.sigla}>{u.sigla} — {u.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Label>Município</Label>
        <Select
          value={municipio || undefined}
          disabled={!uf}
          onValueChange={(v) => onChange({ uf, municipio: v, ibge_code: municipios.find((m) => m.nome === v)?.codigo_ibge ?? null })}
        >
          <SelectTrigger>
            <SelectValue placeholder={!uf ? "Selecione a UF" : loadingMun ? "Carregando..." : "Município"} />
          </SelectTrigger>
          <SelectContent className="max-h-[320px]">
            {municipios.map((m) => <SelectItem key={m.codigo_ibge} value={m.nome}>{m.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
