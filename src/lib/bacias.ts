// Mapa simplificado UF -> bacia hidrográfica predominante.
// Suficiente para visualizações agregadas no Centro de Comando ANA.
// Pode evoluir futuramente para uma coluna `bacia` na tabela `etes`.

export type BaciaKey =
  | "tiete"
  | "saoFrancisco"
  | "parana"
  | "amazonas"
  | "paraguai"
  | "atlanticoSE";

export const BACIAS: { key: BaciaKey; name: string; color: string }[] = [
  { key: "tiete", name: "Tietê", color: "hsl(201, 94%, 32%)" },
  { key: "saoFrancisco", name: "São Francisco", color: "hsl(142, 71%, 45%)" },
  { key: "parana", name: "Paraná", color: "hsl(38, 92%, 50%)" },
  { key: "amazonas", name: "Amazonas", color: "hsl(347, 77%, 41%)" },
  { key: "paraguai", name: "Paraguai", color: "hsl(262, 60%, 50%)" },
  { key: "atlanticoSE", name: "Atlântico SE", color: "hsl(190, 80%, 42%)" },
];

const UF_TO_BACIA: Record<string, BaciaKey> = {
  SP: "tiete",
  MG: "saoFrancisco",
  BA: "saoFrancisco",
  PE: "saoFrancisco",
  AL: "saoFrancisco",
  SE: "saoFrancisco",
  PR: "parana",
  MS: "parana",
  GO: "parana",
  DF: "parana",
  AM: "amazonas",
  PA: "amazonas",
  AC: "amazonas",
  RO: "amazonas",
  RR: "amazonas",
  AP: "amazonas",
  TO: "amazonas",
  MA: "amazonas",
  MT: "paraguai",
  RJ: "atlanticoSE",
  ES: "atlanticoSE",
  SC: "atlanticoSE",
  RS: "atlanticoSE",
  CE: "atlanticoSE",
  RN: "atlanticoSE",
  PB: "atlanticoSE",
  PI: "atlanticoSE",
};

export function ufToBacia(uf: string | null | undefined): BaciaKey {
  if (!uf) return "atlanticoSE";
  return UF_TO_BACIA[uf.toUpperCase()] ?? "atlanticoSE";
}

export function baciaName(key: BaciaKey): string {
  return BACIAS.find((b) => b.key === key)?.name ?? key;
}
