import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type Status = "ativa" | "em_construcao" | "inativa" | "manutencao";

const statusColors: Record<Status, string> = {
  ativa: "#22c55e",
  em_construcao: "#eab308",
  inativa: "#ef4444",
  manutencao: "#64748b",
};

const statusLabels: Record<Status, string> = {
  ativa: "Ativa",
  em_construcao: "Em construção",
  inativa: "Inativa",
  manutencao: "Manutenção",
};

const statusBadgeClass: Record<Status, string> = {
  ativa: "bg-success/10 text-success border-success/30",
  em_construcao: "bg-warning/10 text-warning border-warning/30",
  inativa: "bg-destructive/10 text-destructive border-destructive/30",
  manutencao: "bg-muted text-muted-foreground border-muted-foreground/30",
};

function createIcon(status: Status) {
  const color = statusColors[status];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="6" fill="#fff"/>
  </svg>`;
  return L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
}

interface EteMarker {
  id: string;
  codigo: string | null;
  nome: string;
  municipio: string;
  uf: string;
  lat: number;
  lng: number;
  status: Status;
  tipo_tratamento: string | null;
  vazao_atual_lps: number | null;
  vazao_projeto_lps: number | null;
  concessionariaNome: string | null;
  concessionariaSigla: string | null;
}

function FitBounds({ markers }: { markers: EteMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((e) => [e.lat, e.lng]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, markers]);
  return null;
}

export function EteMap() {
  const [markers, setMarkers] = useState<EteMarker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("etes")
        .select(`
          id, codigo, nome, municipio, uf, latitude, longitude, status,
          tipo_tratamento, vazao_atual_lps, vazao_projeto_lps,
          concessionarias ( nome, sigla )
        `)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (error) {
        console.error("Erro ao carregar ETEs:", error);
        setLoading(false);
        return;
      }

      const mapped: EteMarker[] = (data ?? []).map((e: any) => ({
        id: e.id,
        codigo: e.codigo,
        nome: e.nome,
        municipio: e.municipio,
        uf: e.uf,
        lat: Number(e.latitude),
        lng: Number(e.longitude),
        status: e.status as Status,
        tipo_tratamento: e.tipo_tratamento,
        vazao_atual_lps: e.vazao_atual_lps,
        vazao_projeto_lps: e.vazao_projeto_lps,
        concessionariaNome: e.concessionarias?.nome ?? null,
        concessionariaSigla: e.concessionarias?.sigla ?? null,
      }));

      setMarkers(mapped);
      setLoading(false);
    };
    load();
  }, []);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { ativa: 0, em_construcao: 0, inativa: 0, manutencao: 0 };
    markers.forEach((m) => { c[m.status]++; });
    return c;
  }, [markers]);

  return (
    <div className="bg-card border rounded-sm shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b">
        <div>
          <h2 className="font-semibold">Monitoramento Geoespacial</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {loading ? "Carregando…" : `${markers.length} ETEs georreferenciadas`}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {(["ativa", "em_construcao", "inativa", "manutencao"] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="size-3 rounded-full" style={{ backgroundColor: statusColors[s] }} />
              <span className="text-xs text-muted-foreground">
                {statusLabels[s]} <span className="font-mono">({counts[s]})</span>
              </span>
            </div>
          ))}
          <Badge variant="outline" className="font-mono text-xs">DADOS REAIS</Badge>
        </div>
      </div>
      <div className="h-[480px] relative">
        {!loading && markers.length === 0 && (
          <div className="absolute inset-0 z-[1000] bg-background/80 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
            <p className="text-sm font-medium">Nenhuma ETE georreferenciada cadastrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cadastre ETEs em /operador/etes informando latitude e longitude para visualizá-las aqui.
            </p>
          </div>
        )}
        <MapContainer
          center={[-14.235, -51.9253]}
          zoom={4}
          className="h-full w-full"
          style={{ background: "hsl(var(--muted))" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds markers={markers} />
          <MarkerClusterGroup
            chunkedLoading
            showCoverageOnHover={false}
            spiderfyOnMaxZoom
            maxClusterRadius={55}
            iconCreateFunction={(cluster: any) => {
              const count = cluster.getChildCount();
              const size = count < 10 ? 36 : count < 100 ? 44 : 52;
              return L.divIcon({
                html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:hsl(var(--primary));color:hsl(var(--primary-foreground));border:2px solid #fff;border-radius:9999px;box-shadow:0 2px 6px rgba(0,0,0,0.25);font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:12px;">${count}</div>`,
                className: "ete-cluster-icon",
                iconSize: L.point(size, size, true),
              });
            }}
          >
            {markers.map((ete) => (
              <Marker key={ete.id} position={[ete.lat, ete.lng]} icon={createIcon(ete.status)}>
                <Popup>
                  <div className="min-w-[220px] font-sans">
                    <p className="font-semibold text-sm">{ete.nome}</p>
                    {ete.codigo && (
                      <p className="text-xs text-muted-foreground font-mono">{ete.codigo}</p>
                    )}
                    <div className="mt-2 space-y-1 text-xs">
                      <p>
                        <span className="text-muted-foreground">Município:</span> {ete.municipio}/{ete.uf}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Concessionária:</span>{" "}
                        <strong>
                          {ete.concessionariaSigla ?? ete.concessionariaNome ?? "Sem vínculo"}
                        </strong>
                      </p>
                      {ete.tipo_tratamento && (
                        <p><span className="text-muted-foreground">Tipologia:</span> {ete.tipo_tratamento}</p>
                      )}
                      <p>
                        <span className="text-muted-foreground">Vazão atual:</span>{" "}
                        <strong>{ete.vazao_atual_lps ?? "—"} L/s</strong>
                        {ete.vazao_projeto_lps && (
                          <span className="text-muted-foreground"> / {ete.vazao_projeto_lps} L/s</span>
                        )}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Status:</span>{" "}
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${statusBadgeClass[ete.status]}`}>
                          {statusLabels[ete.status]}
                        </span>
                      </p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
}
