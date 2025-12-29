import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

const COLORS = ["#14b8a6", "#6366f1", "#f59e0b", "#22c55e", "#ef4444"];

export default function VolumePie({ data }) {
  if (!data || !data.length) return null;

  const total = data.reduce((sum, d) => sum + d.volume, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="volume"
          nameKey="symbol"
          innerRadius="45%"   // 🔥 responsive
          outerRadius="75%"   // 🔥 responsive
          paddingAngle={3}
          label={({ percent }) =>
            `${(percent * 100).toFixed(0)}%`
          }
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>

        <Tooltip
          formatter={(value) => [
            `${value.toLocaleString()} (${((value / total) * 100).toFixed(1)}%)`,
            "Volume",
          ]}
        />

        <Legend verticalAlign="bottom" />
      </PieChart>
    </ResponsiveContainer>
  );
}
