import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Options {
  /** Nome do módulo (ex.: "Investimentos"). */
  modulo: string;
  acao?: string;
  orgId?: string | null;
  recordId?: string | null;
  registros?: number | null;
  filtros?: Record<string, unknown>;
  /** Só registra quando verdadeiro (ex.: após o carregamento). */
  enabled?: boolean;
  /** Chave que dispara um novo registro quando muda (filtros aplicados). */
  key?: string;
}

/**
 * Registra na trilha de governança qual usuário acessou qual módulo/organização.
 * Falhas de log nunca interrompem a tela.
 */
export function useAccessLog({ modulo, acao = "VIEW", orgId = null, recordId = null, registros = null, filtros, enabled = true, key = "" }: Options) {
  const last = useRef<string>("");
  useEffect(() => {
    if (!enabled) return;
    const sig = `${modulo}|${acao}|${orgId}|${recordId}|${key}`;
    if (last.current === sig) return;
    last.current = sig;
    const t = setTimeout(() => {
      void supabase.rpc("log_access", {
        _modulo: modulo,
        _acao: acao,
        _org: orgId,
        _record: recordId,
        _registros: registros,
        _filtros: (filtros ?? {}) as never,
      });
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulo, acao, orgId, recordId, key, enabled]);
}
