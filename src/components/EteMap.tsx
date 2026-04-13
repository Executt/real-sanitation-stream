import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const statusColors = {
  ativa: "#22c55e",
  construcao: "#eab308",
  inativa: "#ef4444",
};

function createIcon(status: "ativa" | "construcao" | "inativa") {
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
  codigo: string;
  nome: string;
  municipio: string;
  lat: number;
  lng: number;
  status: "ativa" | "construcao" | "inativa";
  tipologia: string;
  eficienciaDBO: number;
}

const etes: EteMarker[] = [
  { codigo: "ETE-SP-0042", nome: "ETE Barueri", municipio: "Barueri - SP", lat: -23.5115, lng: -46.8763, status: "ativa", tipologia: "Lodos Ativados", eficienciaDBO: 94.2 },
  { codigo: "ETE-SP-0108", nome: "ETE ABC", municipio: "Santo André - SP", lat: -23.6737, lng: -46.5432, status: "ativa", tipologia: "UASB + Filtro", eficienciaDBO: 88.7 },
  { codigo: "ETE-MG-0231", nome: "ETE Arrudas", municipio: "Belo Horizonte - MG", lat: -19.9191, lng: -43.9386, status: "ativa", tipologia: "UASB", eficienciaDBO: 71.3 },
  { codigo: "ETE-RJ-0015", nome: "ETE Alegria", municipio: "Rio de Janeiro - RJ", lat: -22.8876, lng: -43.2291, status: "construcao", tipologia: "Lodos Ativados", eficienciaDBO: 0 },
  { codigo: "ETE-BA-0087", nome: "ETE Jaguaribe", municipio: "Salvador - BA", lat: -12.9714, lng: -38.5124, status: "inativa", tipologia: "Lagoa Facultativa", eficienciaDBO: 0 },
  { codigo: "ETE-PR-0044", nome: "ETE Belém", municipio: "Curitiba - PR", lat: -25.4195, lng: -49.2646, status: "ativa", tipologia: "UASB + Lodos Ativados", eficienciaDBO: 92.1 },
  { codigo: "ETE-RS-0019", nome: "ETE São João", municipio: "Porto Alegre - RS", lat: -30.0346, lng: -51.2177, status: "ativa", tipologia: "Lodos Ativados", eficienciaDBO: 89.5 },
  { codigo: "ETE-CE-0055", nome: "ETE Cocó", municipio: "Fortaleza - CE", lat: -3.7327, lng: -38.5270, status: "ativa", tipologia: "Lagoa Anaeróbia", eficienciaDBO: 67.8 },
  { codigo: "ETE-PA-0012", nome: "ETE Maguari", municipio: "Belém - PA", lat: -1.3553, lng: -48.3784, status: "construcao", tipologia: "UASB", eficienciaDBO: 0 },
  { codigo: "ETE-AM-0003", nome: "ETE Educandos", municipio: "Manaus - AM", lat: -3.1190, lng: -60.0217, status: "ativa", tipologia: "Lodos Ativados", eficienciaDBO: 62.4 },
  { codigo: "ETE-GO-0028", nome: "ETE Goiânia", municipio: "Goiânia - GO", lat: -16.6869, lng: -49.2648, status: "ativa", tipologia: "UASB + Filtro", eficienciaDBO: 85.3 },
  { codigo: "ETE-PE-0041", nome: "ETE Cabanga", municipio: "Recife - PE", lat: -8.0476, lng: -34.8770, status: "ativa", tipologia: "Lodos Ativados", eficienciaDBO: 78.9 },
  { codigo: "ETE-DF-0007", nome: "ETE Brasília Sul", municipio: "Brasília - DF", lat: -15.8697, lng: -47.9172, status: "ativa", tipologia: "Lodos Ativados", eficienciaDBO: 96.1 },
  { codigo: "ETE-SC-0033", nome: "ETE Insular", municipio: "Florianópolis - SC", lat: -27.5954, lng: -48.5480, status: "ativa", tipologia: "Lodos Ativados", eficienciaDBO: 91.7 },
  { codigo: "ETE-MT-0009", nome: "ETE Dom Aquino", municipio: "Cuiabá - MT", lat: -15.5989, lng: -56.0949, status: "construcao", tipologia: "Lagoa Facultativa", eficienciaDBO: 0 },
  { codigo: "ETE-MS-0018", nome: "ETE Los Angeles", municipio: "Campo Grande - MS", lat: -20.4697, lng: -54.6201, status: "ativa", tipologia: "UASB + Lodos Ativados", eficienciaDBO: 87.2 },
  { codigo: "ETE-MA-0006", nome: "ETE Vinhais", municipio: "São Luís - MA", lat: -2.5297, lng: -44.2825, status: "inativa", tipologia: "Lagoa Anaeróbia", eficienciaDBO: 0 },
  { codigo: "ETE-PI-0004", nome: "ETE Leste", municipio: "Teresina - PI", lat: -5.0892, lng: -42.8019, status: "ativa", tipologia: "UASB", eficienciaDBO: 69.4 },
];

const statusLabels = {
  ativa: "Ativa",
  construcao: "Em construção",
  inativa: "Inativa",
};

const statusBadgeClass = {
  ativa: "bg-success/10 text-success border-success/30",
  construcao: "bg-warning/10 text-warning border-warning/30",
  inativa: "bg-destructive/10 text-destructive border-destructive/30",
};

function FitBounds() {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(etes.map((e) => [e.lat, e.lng]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map]);
  return null;
}

export function EteMap() {
  return (
    <div className="bg-card border rounded-sm shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b">
        <div>
          <h2 className="font-semibold">Monitoramento Geoespacial</h2>
          <p className="text-xs text-muted-foreground mt-1">ETEs mapeadas com status operacional em tempo real</p>
        </div>
        <div className="flex items-center gap-4">
          {(["ativa", "construcao", "inativa"] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="size-3 rounded-full" style={{ backgroundColor: statusColors[s] }} />
              <span className="text-xs text-muted-foreground">{statusLabels[s]}</span>
            </div>
          ))}
          <Badge variant="outline" className="font-mono text-xs">SNIRH INTEGRADO</Badge>
        </div>
      </div>
      <div className="h-[480px]">
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
          <FitBounds />
          {etes.map((ete) => (
            <Marker key={ete.codigo} position={[ete.lat, ete.lng]} icon={createIcon(ete.status)}>
              <Popup>
                <div className="min-w-[200px] font-sans">
                  <p className="font-semibold text-sm">{ete.nome}</p>
                  <p className="text-xs text-muted-foreground font-mono">{ete.codigo}</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p><span className="text-muted-foreground">Município:</span> {ete.municipio}</p>
                    <p><span className="text-muted-foreground">Tipologia:</span> {ete.tipologia}</p>
                    <p><span className="text-muted-foreground">Status:</span> <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${statusBadgeClass[ete.status]}`}>{statusLabels[ete.status]}</span></p>
                    {ete.eficienciaDBO > 0 && (
                      <p><span className="text-muted-foreground">Eficiência DBO:</span> <strong>{ete.eficienciaDBO}%</strong></p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
