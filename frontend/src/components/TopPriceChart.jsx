import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function TopPriceChart({ data }) {
  if (!data || data.length === 0) {
    return <p style={{ color: "#666" }}>No chart data available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="price" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="price" fill="#4f46e5" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
