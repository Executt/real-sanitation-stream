import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAccessLog } from "@/hooks/useAccessLog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/StatCard";
import { ATLAS_DATASETS, detectDataset, findColumn, type AtlasDataset, type AtlasRow } from "@/lib/atlasDictionary";
import { INVESTMENT_CATEGORY_LABEL, EPPO_LABEL } from "@/types/governance";
import { AlertTriangle, CheckCircle2, Database, FileSpreadsheet, Upload } from "lucide-react";

interface Batch {
  id: string;
  arquivo: string;
  planilha: string | null;
  dataset: string;
  status: string;
  linhas_lidas: number;
  linhas_gravadas: number;
  linhas_ignoradas: number;
  created_at: string;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function AtlasImport() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [dataset, setDataset] = useState<AtlasDataset | null>(null);
  const [sheet, setSheet] = useState<string>("");
  const [missing, setMissing] = useState<string[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [preview, setPreview] = useState<AtlasRow[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batches, setBatches] = useState<Batch[]>([]);

  useAccessLog({ modulo: "Importação Atlas", acao: "VIEW" });

  const loadBatches = useCallback(async () => {
    const { data } = await supabase
      .from("atlas_import_batches")
      .select("id, arquivo, planilha, dataset, status, linhas_lidas, linhas_gravadas, linhas_ignoradas, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setBatches((data ?? []) as Batch[]);
  }, []);

  useEffect(() => { void loadBatches(); }, [loadBatches]);

  const reset = () => {
    setDataset(null); setSheet(""); setMissing([]); setFound([]); setPreview([]); setErros([]); setProgress(0);
  };

  const onFile = async (f: File) => {
    setFile(f); reset(); setParsing(true);
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const ds = detectDataset(f.name, wb.SheetNames);
      if (!ds) {
        setErros([`Arquivo não reconhecido. Abas encontradas: ${wb.SheetNames.join(", ")}. Datasets suportados: ${ATLAS_DATASETS.map((d) => d.arquivoSugerido).join(", ")}.`]);
        setParsing(false);
        return;
      }
      const sheetName = wb.SheetNames.find((s) => s === ds.sheet) ?? wb.SheetNames[0];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: "", raw: true });
      const header = (raw[ds.headerRow] ?? []).map((h) => String(h ?? "").trim());
      const body = raw.slice(ds.headerRow + 1).map((r) => {
        const o: Record<string, unknown> = {};
        header.forEach((h, i) => { if (h) o[h] = (r as unknown[])[i]; });
        return o;
      }).filter((o) => Object.values(o).some((v) => String(v ?? "").trim() !== ""));

      const miss = ds.required.filter((c) => !findColumn(header, c));
      setDataset(ds); setSheet(sheetName); setMissing(miss); setFound(header.filter(Boolean));
      if (miss.length) {
        setErros([`O dicionário da planilha não confere: ${miss.length} coluna(s) obrigatória(s) ausente(s).`]);
        setParsing(false);
        return;
      }
      const { rows, erros: errs } = ds.normalize(body, f.name);
      setPreview(rows); setErros(errs);
    } catch (e) {
      setErros([`Falha ao ler o arquivo: ${(e as Error).message}`]);
    }
    setParsing(false);
  };

  const gravar = async () => {
    if (!dataset || !file || !preview.length) return;
    setSaving(true); setProgress(0);
    const { data: userRes } = await supabase.auth.getUser();
    const { data: batch, error: bErr } = await supabase
      .from("atlas_import_batches")
      .insert({
        arquivo: file.name, planilha: sheet, dataset: dataset.id, status: "processando",
        linhas_lidas: preview.length + erros.length, linhas_ignoradas: erros.length,
        erros: erros.slice(0, 200), mapeamento: { colunas_obrigatorias: dataset.required, header_row: dataset.headerRow },
        created_by: userRes.user?.id ?? null,
      })
      .select("id")
      .single();

    if (bErr || !batch) {
      toast({ title: "Não foi possível registrar o lote", description: bErr?.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const chunk = 500;
    let gravadas = 0;
    let falha: string | null = null;
    for (let i = 0; i < preview.length; i += chunk) {
      const slice = preview.slice(i, i + chunk).map((r) => ({ ...r, org_id: null, import_batch_id: batch.id }));
      const { error } = await supabase
        .from("investments_planning")
        .upsert(slice, { onConflict: "external_key", ignoreDuplicates: false });
      if (error) { falha = error.message; break; }
      gravadas += slice.length;
      setProgress(Math.round((gravadas / preview.length) * 100));
    }

    await supabase.from("atlas_import_batches").update({
      status: falha ? "erro" : "concluido",
      linhas_gravadas: gravadas,
      erros: falha ? [...erros.slice(0, 199), falha] : erros.slice(0, 200),
    }).eq("id", batch.id);

    await supabase.rpc("log_access", {
      _modulo: "Importação Atlas", _acao: "IMPORT", _org: null, _record: batch.id,
      _registros: gravadas, _filtros: { arquivo: file.name, dataset: dataset.id } as never,
    });

    setSaving(false);
    void loadBatches();
    if (falha) toast({ title: "Importação interrompida", description: falha, variant: "destructive" });
    else toast({ title: "Importação concluída", description: `${gravadas} registros gravados em investments_planning.` });
  };

  const total = preview.reduce((a, r) => a + r.estimated_value, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="size-5 text-primary" /> Importação Atlas Águas
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Valida o dicionário das planilhas oficiais e normaliza os dados para o planejamento de investimentos.
        </p>
      </div>

      <div className="bg-card border rounded-sm p-5 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
            />
            <span className="inline-flex items-center gap-2 h-9 px-4 rounded-sm bg-primary text-primary-foreground text-sm font-medium cursor-pointer">
              <Upload className="size-4" /> Selecionar planilha
            </span>
          </label>
          {file && <Badge variant="outline" className="font-mono text-xs">{file.name}</Badge>}
          {dataset && <Badge className="font-mono text-xs">{dataset.label}</Badge>}
          {sheet && <span className="text-xs text-muted-foreground font-mono">aba: {sheet}</span>}
          {parsing && <span className="text-xs text-muted-foreground">Lendo arquivo...</span>}
        </div>

        <div className="mt-4 text-xs text-muted-foreground font-mono">
          Datasets suportados: {ATLAS_DATASETS.map((d) => `${d.arquivoSugerido} (${d.sheet})`).join(" · ")}
        </div>
      </div>

      {!!missing.length && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="size-4" />
          <AlertTitle>Dicionário inválido</AlertTitle>
          <AlertDescription>
            Colunas obrigatórias ausentes: <span className="font-mono">{missing.join(" · ")}</span>.
            <div className="mt-2 text-xs">Colunas lidas: {found.slice(0, 25).join(" · ")}</div>
          </AlertDescription>
        </Alert>
      )}

      {!!preview.length && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Registros válidos" value={String(preview.length)} icon={CheckCircle2} />
            <StatCard label="Linhas ignoradas" value={String(erros.length)} variant={erros.length ? "warning" : undefined} icon={AlertTriangle} />
            <StatCard label="Investimento total" value={brl(total)} icon={Database} />
            <StatCard label="Categorias" value={String(new Set(preview.map((r) => r.category)).size)} icon={Database} />
          </div>

          <div className="bg-card border rounded-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Prévia normalizada (20 primeiras linhas)</h2>
              <div className="flex items-center gap-3">
                {saving && <Progress value={progress} className="w-40" />}
                <Button onClick={gravar} disabled={saving || !!missing.length}>
                  {saving ? `Gravando ${progress}%` : "Gravar no banco"}
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Município</TableHead>
                    <TableHead>IBGE</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>EPPO</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Título</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 20).map((r) => (
                    <TableRow key={r.external_key}>
                      <TableCell className="whitespace-nowrap">{r.municipio}/{r.uf}</TableCell>
                      <TableCell className="font-mono text-xs">{r.ibge_code}</TableCell>
                      <TableCell><Badge variant="outline">{INVESTMENT_CATEGORY_LABEL[r.category]}</Badge></TableCell>
                      <TableCell className="text-xs">{EPPO_LABEL[r.eppo]}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(r.estimated_value)}</TableCell>
                      <TableCell className="max-w-[380px] truncate text-xs">{r.titulo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {!!erros.length && (
        <div className="bg-card border rounded-sm p-5 mb-6">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="size-4 text-[hsl(var(--warning))]" /> Inconsistências ({erros.length})
          </h2>
          <ul className="text-xs font-mono text-muted-foreground space-y-1 max-h-48 overflow-auto">
            {erros.slice(0, 100).map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="bg-card border rounded-sm p-5">
        <h2 className="text-sm font-semibold mb-4">Histórico de importações</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Dataset</TableHead>
              <TableHead className="text-right">Lidas</TableHead>
              <TableHead className="text-right">Gravadas</TableHead>
              <TableHead className="text-right">Ignoradas</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-6">Nenhuma importação registrada.</TableCell></TableRow>
            )}
            {batches.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{new Date(b.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-xs">{b.arquivo}</TableCell>
                <TableCell className="text-xs">{b.dataset}</TableCell>
                <TableCell className="text-right font-mono text-xs">{b.linhas_lidas}</TableCell>
                <TableCell className="text-right font-mono text-xs">{b.linhas_gravadas}</TableCell>
                <TableCell className="text-right font-mono text-xs">{b.linhas_ignoradas}</TableCell>
                <TableCell>
                  <Badge variant={b.status === "concluido" ? "default" : b.status === "erro" ? "destructive" : "outline"}>
                    {b.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
