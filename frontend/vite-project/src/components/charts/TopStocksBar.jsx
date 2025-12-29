import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function TopStocksBar({ data }) {
  if (!data || !data.length) return null;

  const chartData = data.slice(0, 8);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        barCategoryGap="20%"
        margin={{ top: 20, right: 30, left: 10, bottom: 80 }}
      >
        <XAxis
          dataKey="symbol"
          angle={-45}
          textAnchor="end"
          interval={0}
          height={80}
          tick={{ fontSize: 12 ,fill: '#64748b'}}
        />

        <YAxis tick={{ fontSize: 12 }} />

        <Tooltip
          formatter={(value) => [`₹ ${value.toLocaleString()}`, "Price"]}
        />

        {/* 🔥 THIS IS IMPORTANT */}
        <Bar
          dataKey="price"
          fill="#4f46e5"
          barSize={42}       // 👈 FORCE BAR WIDTH
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
