import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UfRow { sigla: string; nome: string }
export interface MunicipioRow { codigo_ibge: string; nome: string; uf: string }

let ufCache: UfRow[] | null = null;

/** Lista de UFs pré-cadastradas a partir do IBGE. */
export function useUfs() {
  const [ufs, setUfs] = useState<UfRow[]>(ufCache ?? []);
  const [loading, setLoading] = useState(!ufCache);

  useEffect(() => {
    if (ufCache) return;
    let alive = true;
    void (async () => {
      const { data } = await supabase.from("ufs").select("sigla, nome").order("sigla");
      if (!alive) return;
      ufCache = (data ?? []) as UfRow[];
      setUfs(ufCache);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return { ufs, loading };
}

/** Municípios do IBGE da UF selecionada. */
export function useMunicipios(uf: string | null) {
  const [municipios, setMunicipios] = useState<MunicipioRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uf || uf === "all") { setMunicipios([]); return; }
    let alive = true;
    setLoading(true);
    void (async () => {
      const { data } = await supabase
        .from("municipios")
        .select("codigo_ibge, nome, uf")
        .eq("uf", uf)
        .order("nome")
        .limit(1000);
      if (!alive) return;
      setMunicipios((data ?? []) as MunicipioRow[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [uf]);

  return { municipios, loading };
}
