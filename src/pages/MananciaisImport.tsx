import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrg } from "@/contexts/OrgContext";
import { useAccessLog } from "@/hooks/useAccessLog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/StatCard";
import { AlertTriangle, CheckCircle2, Cloud, Download, Droplets, RefreshCw, Upload } from "lucide-react";
import {
  API_PRESETS, CAMPOS, MODELO_JSON, extrairRegistros, normalizar, type MananciaRow,
} from "@/lib/mananciaisImport";
import { VULNERABILITY_LABEL, WATER_SOURCE_LABEL } from "@/types/governance";

export default function MananciaisImport() {
  const { toast } = useToast();
  const { orgs } = useOrg();
  const [rows, setRows] = useState<MananciaRow[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [fonte, setFonte] = useState("Importação manual");
  const [orgId, setOrgId] = useState<string>("none");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Pré-cadastro de estados/municípios
  const [geo, setGeo] = useState<{ ufs: number; municipios: number }>({ ufs: 0, municipios: 0 });

  // Importação por API
  const [apiUrl, setApiUrl] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [service, setService] = useState("");
  const [layers, setLayers] = useState<{ id: number; name: string }[]>([]);

  // Portal geoespacial (qualquer órgão)
  const [portalUrl, setPortalUrl] = useState("");
  const [portalItem, setPortalItem] = useState("");
  const [portalNome, setPortalNome] = useState("Portal geoespacial");

  useAccessLog({ modulo: "Importação de Mananciais", acao: "VIEW" });

  const loadGeo = async () => {
    const [u, m] = await Promise.all([
      supabase.from("ufs").select("sigla", { count: "exact", head: true }),
      supabase.from("municipios").select("codigo_ibge", { count: "exact", head: true }),
    ]);
    setGeo({ ufs: u.count ?? 0, municipios: m.count ?? 0 });
  };

  useEffect(() => { void loadGeo(); }, []);

  const sincronizarGeo = async (force = false) => {
    setBusy("geo");
    const { data, error } = await supabase.functions.invoke("geo-sync-ibge", { body: { force } });
    setBusy(null);
    if (error) { toast({ title: "Falha ao carregar municípios", description: error.message, variant: "destructive" }); return; }
    const res = data as { skipped?: boolean; municipios?: number; error?: string };
    if (res?.error) { toast({ title: "Falha ao carregar municípios", description: res.error, variant: "destructive" }); return; }
    await loadGeo();
    toast({ title: res?.skipped ? "Municípios já cadastrados" : "Estados e municípios atualizados" });
  };

  const aplicar = (registros: Record<string, unknown>[], origem: string) => {
    const { rows: r, erros: e } = normalizar(registros, origem);
    setRows(r); setErros(e); setFonte(origem);
    if (!r.length) toast({ title: "Nenhum registro válido encontrado", variant: "destructive" });
  };

  const onFile = async (f: File) => {
    setBusy("file");
    try {
      if (f.name.toLowerCase().endsWith(".json")) {
        aplicar(extrairRegistros(JSON.parse(await f.text())), `Arquivo JSON: ${f.name}`);
      } else {
        const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        aplicar(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" }), `Planilha: ${f.name}`);
      }
    } catch (err) {
      setErros([`Falha ao ler o arquivo: ${(err as Error).message}`]);
      setRows([]);
    }
    setBusy(null);
  };

  const callProxy = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("remote-dataset", { body });
    if (error) throw new Error(error.message);
    const res = data as { error?: string } & Record<string, unknown>;
    if (res?.error) throw new Error(String(res.error));
    return res;
  };

  const descobrirPortal = async () => {
    if (!portalUrl.trim()) { toast({ title: "Informe o endereço do portal", variant: "destructive" }); return; }
    setBusy("discover"); setServices([]); setLayers([]); setService("");
    try {
      const res = await callProxy({
        discoverPortalItem: { portal: portalUrl.trim().replace(/\/$/, ""), itemId: portalItem.trim() },
      });
      const found = (res.services as string[]) ?? [];
      setServices(found);
      if (!found.length) toast({ title: "Nenhuma camada localizada neste portal", variant: "destructive" });
    } catch (e) {
      toast({ title: "Não foi possível consultar o portal", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(null);
  };

  const listarCamadas = async (svc: string) => {
    setService(svc); setLayers([]);
    setBusy("layers");
    try {
      const res = await callProxy({ arcgisLayers: svc });
      setLayers((res.layers as { id: number; name: string }[]) ?? []);
    } catch (e) {
      toast({ title: "Não foi possível listar as camadas", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(null);
  };

  const importarCamada = async (layerId: number, nomeCamada: string) => {
    setBusy("fetch");
    try {
      const url = `${service.replace(/\/$/, "")}/${layerId}/query?where=1%3D1&outFields=*&returnGeometry=true&f=json&resultRecordCount=2000`;
      const res = await callProxy({ url });
      aplicar(extrairRegistros(res.data), `INEA/RJ - ${nomeCamada}`);
    } catch (e) {
      toast({ title: "Falha ao importar a camada", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(null);
  };

  const importarUrl = async () => {
    if (!apiUrl.trim()) return;
    setBusy("fetch");
    try {
      const res = await callProxy({ url: apiUrl.trim() });
      aplicar(extrairRegistros(res.data), `API: ${new URL(apiUrl).hostname}`);
    } catch (e) {
      toast({ title: "Falha ao consultar a API", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(null);
  };

  const gravar = async () => {
    if (!rows.length) return;
    setBusy("save"); setProgress(0);
    const alvo = orgId === "none" ? null : orgId;
    let gravadas = 0; let falha: string | null = null;
    for (let i = 0; i < rows.length; i += 300) {
      const slice = rows.slice(i, i + 300).map((r) => ({ ...r, org_id: alvo }));
      const { error } = await supabase.from("water_sources").upsert(slice, { onConflict: "external_key" });
      if (error) { falha = error.message; break; }
      gravadas += slice.length;
      setProgress(Math.round((gravadas / rows.length) * 100));
    }
    await supabase.rpc("log_access", {
      _modulo: "Importação de Mananciais", _acao: "IMPORT", _org: alvo, _record: null,
      _registros: gravadas, _filtros: { fonte } as never,
    });
    setBusy(null);
    if (falha) toast({ title: "Importação interrompida", description: falha, variant: "destructive" });
    else toast({ title: "Importação concluída", description: `${gravadas} mananciais gravados.` });
  };

  const baixarModelo = (tipo: "json" | "xlsx") => {
    if (tipo === "json") {
      const blob = new Blob([JSON.stringify(MODELO_JSON, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "modelo_mananciais.json"; a.click();
      URL.revokeObjectURL(a.href);
    } else {
      const ws = XLSX.utils.json_to_sheet(MODELO_JSON);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mananciais");
      XLSX.writeFile(wb, "modelo_mananciais.xlsx");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Droplets className="size-5 text-primary" /> Importação de Mananciais
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Padrão único de importação por arquivo (JSON/XLSX) ou API, com estados e municípios pré-cadastrados (IBGE).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Estados cadastrados" value={String(geo.ufs)} icon={CheckCircle2} />
        <StatCard label="Municípios cadastrados" value={String(geo.municipios)} icon={CheckCircle2} variant={geo.municipios ? undefined : "warning"} />
        <div className="bg-card border rounded-sm p-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-medium">Base territorial (IBGE)</p>
            <p className="text-xs text-muted-foreground">Preenche as seleções de UF e município.</p>
          </div>
          <Button variant="outline" size="sm" disabled={busy === "geo"} onClick={() => void sincronizarGeo(true)}>
            <RefreshCw className={`size-4 mr-1.5 ${busy === "geo" ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="arquivo" className="mb-6">
        <TabsList>
          <TabsTrigger value="arquivo">Arquivo (JSON / XLSX)</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="inea">INEA / RJ</TabsTrigger>
          <TabsTrigger value="padrao">Padrão de dados</TabsTrigger>
        </TabsList>

        <TabsContent value="arquivo">
          <div className="bg-card border rounded-sm p-5 flex flex-wrap items-center gap-3">
            <label className="inline-flex">
              <input type="file" accept=".json,.xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }} />
              <span className="inline-flex items-center gap-2 h-9 px-4 rounded-sm bg-primary text-primary-foreground text-sm font-medium cursor-pointer">
                <Upload className="size-4" /> Selecionar arquivo
              </span>
            </label>
            <Button variant="outline" size="sm" onClick={() => baixarModelo("xlsx")}><Download className="size-4 mr-1.5" /> Modelo XLSX</Button>
            <Button variant="outline" size="sm" onClick={() => baixarModelo("json")}><Download className="size-4 mr-1.5" /> Modelo JSON</Button>
            {busy === "file" && <span className="text-xs text-muted-foreground">Lendo arquivo...</span>}
          </div>
        </TabsContent>

        <TabsContent value="api">
          <div className="bg-card border rounded-sm p-5 space-y-3">
            <Label>URL da API (JSON, GeoJSON ou ArcGIS query)</Label>
            <div className="flex gap-3">
              <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://exemplo.gov.br/api/mananciais" />
              <Button onClick={() => void importarUrl()} disabled={busy === "fetch"}>
                <Cloud className="size-4 mr-1.5" /> {busy === "fetch" ? "Consultando..." : "Consultar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Aceita array JSON, FeatureCollection GeoJSON ou resposta ArcGIS (features/attributes).
            </p>
          </div>
        </TabsContent>

        <TabsContent value="inea">
          <div className="bg-card border rounded-sm p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{API_PRESETS[0].label}</p>
                <p className="text-xs text-muted-foreground">{API_PRESETS[0].descricao}</p>
              </div>
              <Button onClick={() => void descobrirInea()} disabled={busy === "discover"}>
                {busy === "discover" ? "Consultando portal..." : "Buscar camadas do INEA"}
              </Button>
            </div>

            {!!services.length && (
              <div className="space-y-2">
                <Label>Serviço publicado</Label>
                <Select value={service} onValueChange={(v) => void listarCamadas(v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => <SelectItem key={s} value={s} className="font-mono text-xs">{s.split("/services/")[1] ?? s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!!layers.length && (
              <div className="flex flex-wrap gap-2">
                {layers.map((l) => (
                  <Button key={l.id} variant="outline" size="sm" disabled={busy === "fetch"}
                    onClick={() => void importarCamada(l.id, l.name)}>
                    {l.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="padrao">
          <div className="bg-card border rounded-sm p-5">
            <h2 className="text-sm font-semibold mb-3">Colunas reconhecidas automaticamente</h2>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-1 text-xs font-mono">
              {Object.entries(CAMPOS).map(([campo, alias]) => (
                <div key={campo} className="flex gap-2">
                  <span className="text-primary min-w-[170px]">{campo}</span>
                  <span className="text-muted-foreground truncate">{alias.join(" · ")}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Somente “nome” é obrigatório. Tipo e vulnerabilidade aceitam termos em português (superficial, subterrâneo, alta, crítica...).
              A chave “external_key” evita duplicatas em reimportações.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {!!rows.length && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Registros válidos" value={String(rows.length)} icon={CheckCircle2} />
            <StatCard label="Ignorados" value={String(erros.length)} variant={erros.length ? "warning" : undefined} icon={AlertTriangle} />
            <StatCard label="Com coordenadas" value={String(rows.filter((r) => r.latitude && r.longitude).length)} icon={Droplets} />
            <StatCard label="Municípios distintos" value={String(new Set(rows.map((r) => r.municipio)).size)} icon={Droplets} />
          </div>

          <div className="bg-card border rounded-sm p-5 mb-6">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <div className="min-w-[280px]">
                <Label>Organização vinculada</Label>
                <Select value={orgId} onValueChange={setOrgId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo (referência nacional/estadual)</SelectItem>
                    {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.sigla || o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-xs">{fonte}</Badge>
                {busy === "save" && <Progress value={progress} className="w-40" />}
                <Button onClick={() => void gravar()} disabled={busy === "save"}>
                  {busy === "save" ? `Gravando ${progress}%` : "Gravar mananciais"}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manancial</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vulnerabilidade</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead className="text-right">Outorga (L/s)</TableHead>
                    <TableHead>Coordenadas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 20).map((r) => (
                    <TableRow key={r.external_key}>
                      <TableCell className="font-medium max-w-[280px] truncate">{r.nome}</TableCell>
                      <TableCell>{WATER_SOURCE_LABEL[r.type]}</TableCell>
                      <TableCell><Badge variant="outline">{VULNERABILITY_LABEL[r.vulnerability_level]}</Badge></TableCell>
                      <TableCell className="text-xs">{[r.municipio, r.uf].filter(Boolean).join(" / ") || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.vazao_outorgada_lps ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.latitude && r.longitude ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {!!erros.length && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Inconsistências ({erros.length})</AlertTitle>
          <AlertDescription>
            <ul className="text-xs font-mono space-y-1 max-h-40 overflow-auto mt-2">
              {erros.slice(0, 50).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
