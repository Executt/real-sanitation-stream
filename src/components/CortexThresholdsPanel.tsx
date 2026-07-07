import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Save, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Threshold } from "@/lib/cortexThresholds";

interface Props {
  thresholds: Threshold[];
  modelos: { id: string; nome: string; versao: string }[];
  bacias: string[];
  onChanged: () => void;
}

export function CortexThresholdsPanel({ thresholds, modelos, bacias, onChanged }: Props) {
  const [draft, setDraft] = useState({ bacia: "__all__", modelo_id: "__all__", alto_min: "0.50", critico_min: "0.75" });
  const [editing, setEditing] = useState<Record<string, { alto_min: string; critico_min: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: typeof editing = {};
    for (const t of thresholds) next[t.id] = { alto_min: String(t.alto_min), critico_min: String(t.critico_min) };
    setEditing(next);
  }, [thresholds]);

  async function add() {
    const alto = Number(draft.alto_min);
    const crit = Number(draft.critico_min);
    if (!(alto >= 0 && alto <= 1 && crit >= 0 && crit <= 1 && crit >= alto)) {
      toast({ title: "Limiares inválidos", description: "Use valores entre 0 e 1 e crítico ≥ alto.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("cortex_thresholds").insert({
      bacia: draft.bacia === "__all__" ? null : draft.bacia,
      modelo_id: draft.modelo_id === "__all__" ? null : draft.modelo_id,
      alto_min: alto,
      critico_min: crit,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Falha ao adicionar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Limiar adicionado" });
    setDraft({ bacia: "__all__", modelo_id: "__all__", alto_min: "0.50", critico_min: "0.75" });
    onChanged();
  }

  async function save(id: string) {
    const e = editing[id];
    const alto = Number(e.alto_min);
    const crit = Number(e.critico_min);
    if (!(alto >= 0 && alto <= 1 && crit >= 0 && crit <= 1 && crit >= alto)) {
      toast({ title: "Limiares inválidos", description: "Use valores entre 0 e 1 e crítico ≥ alto.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("cortex_thresholds").update({ alto_min: alto, critico_min: crit }).eq("id", id);
    if (error) {
      toast({ title: "Falha ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Limiar atualizado" });
    onChanged();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("cortex_thresholds").delete().eq("id", id);
    if (error) {
      toast({ title: "Falha ao remover", description: error.message, variant: "destructive" });
      return;
    }
    onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          Limiares de risco por bacia e modelo
          <Badge variant="outline" className="text-[10px] font-mono ml-1">{thresholds.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Regra aplicada: <strong>crítico</strong> quando risco ≥ crítico_min; <strong>alto</strong> quando ≥ alto_min.
          Combinações mais específicas (bacia + modelo) prevalecem sobre as gerais. Alterações refletem imediatamente nos KPIs e filtros.
        </p>

        <div className="border rounded-sm p-3 bg-muted/30 grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground">Bacia</label>
            <Select value={draft.bacia} onValueChange={(v) => setDraft({ ...draft, bacia: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {bacias.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground">Modelo</label>
            <Select value={draft.modelo_id} onValueChange={(v) => setDraft({ ...draft, modelo_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {modelos.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome} {m.versao}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground">Alto ≥</label>
            <Input type="number" step="0.05" min="0" max="1" value={draft.alto_min} onChange={(e) => setDraft({ ...draft, alto_min: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground">Crítico ≥</label>
            <Input type="number" step="0.05" min="0" max="1" value={draft.critico_min} onChange={(e) => setDraft({ ...draft, critico_min: e.target.value })} />
          </div>
          <Button onClick={add} disabled={saving}><Plus className="size-4 mr-1" />Adicionar</Button>
        </div>

        <div className="space-y-2">
          {thresholds.map((t) => {
            const modelo = modelos.find((m) => m.id === t.modelo_id);
            const e = editing[t.id] ?? { alto_min: String(t.alto_min), critico_min: String(t.critico_min) };
            const dirty = e.alto_min !== String(t.alto_min) || e.critico_min !== String(t.critico_min);
            return (
              <div key={t.id} className="border rounded-sm p-2 grid grid-cols-1 md:grid-cols-5 gap-2 items-center text-sm">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{t.bacia ?? "todas bacias"}</Badge>
                  <Badge variant="outline" className="text-[10px]">{modelo ? `${modelo.nome} ${modelo.versao}` : "todos modelos"}</Badge>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground">Alto ≥</label>
                  <Input type="number" step="0.05" min="0" max="1" value={e.alto_min}
                    onChange={(ev) => setEditing({ ...editing, [t.id]: { ...e, alto_min: ev.target.value } })} />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground">Crítico ≥</label>
                  <Input type="number" step="0.05" min="0" max="1" value={e.critico_min}
                    onChange={(ev) => setEditing({ ...editing, [t.id]: { ...e, critico_min: ev.target.value } })} />
                </div>
                <div className="flex gap-1 md:col-span-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => save(t.id)} disabled={!dirty}>
                    <Save className="size-3 mr-1" />Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(t.id)}>
                    <Trash2 className="size-3 mr-1" />Remover
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
