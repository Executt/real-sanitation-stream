import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const bacias = [
  { key: "tiete", name: "Tietê", color: "hsl(201, 94%, 32%)" },
  { key: "saoFrancisco", name: "São Francisco", color: "hsl(142, 71%, 45%)" },
  { key: "parana", name: "Paraná", color: "hsl(38, 92%, 50%)" },
  { key: "amazonas", name: "Amazonas", color: "hsl(347, 77%, 41%)" },
  { key: "paraguai", name: "Paraguai", color: "hsl(262, 60%, 50%)" },
  { key: "atlanticoSE", name: "Atlântico SE", color: "hsl(190, 80%, 42%)" },
];

function generateData() {
  return months.map((m, i) => {
    const base: Record<string, string | number> = { mes: m };
    bacias.forEach((b) => {
      const seed = b.key.length * 3 + i * 7;
      const baseVal = b.key === "amazonas" ? 55 : b.key === "saoFrancisco" ? 70 : 82;
      base[b.key] = +(baseVal + Math.sin(seed) * 6 + i * 0.4).toFixed(1);
    });
    return base;
  });
}

export function DboTrendChart() {
  const data = useMemo(() => generateData(), []);

  return (
    <div className="bg-card border rounded-sm shadow-sm p-6">
      <div className="mb-6">
        <h2 className="font-semibold text-lg">Evolução da Eficiência DBO por Bacia</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Percentual de remoção de DBO — últimos 12 meses
        </p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
          <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
          <YAxis
            domain={[40, 100]}
            tick={{ fontSize: 12 }}
            stroke="hsl(215, 16%, 47%)"
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0, 0%, 100%)",
              border: "1px solid hsl(214, 32%, 91%)",
              borderRadius: "4px",
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value}%`, undefined]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {bacias.map((b) => (
            <Line
              key={b.key}
              type="monotone"
              dataKey={b.key}
              name={b.name}
              stroke={b.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
