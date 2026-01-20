import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const COLORS = [
  "#4f46e5",
  "#22c55e",
  "#f97316",
  "#06b6d4",
  "#ec4899",
  "#a855f7",
  "#84cc16",
  "#eab308"
];

export default function VolumeChart({ data }) {
  if (!data || data.length === 0) {
    return <p>No volume data available</p>;
  }

  // Take top 8 volumes for clarity
  const chartData = data
    .filter(item => item.volume !== undefined)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8)
    .map(item => ({
      name: item.name || "Stock",
      value: item.volume
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={4}
        >
          {chartData.map((_, index) => (
            <Cell
              key={index}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
