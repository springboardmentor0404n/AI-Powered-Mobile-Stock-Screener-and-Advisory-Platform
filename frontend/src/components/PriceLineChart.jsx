import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

export default function PriceLineChart({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
  return <div className="empty-chart">No price data</div>;
}


  const chartData = data.map((item, index) => ({
    name: `Stock ${index + 1}`,
    price: item.price || item.revenuepershare || 0
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <defs>
  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stopColor="#22d3ee">
      <animate attributeName="offset" values="0;1" dur="3s" repeatCount="indefinite" />
    </stop>
    <stop offset="100%" stopColor="#8b5cf6" />
  </linearGradient>

  <filter id="glow">
    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
    <feMerge>
      <feMergeNode in="coloredBlur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
</defs>


        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line
  type="monotone"
  dataKey="price"
  stroke="url(#lineGradient)"
  strokeWidth={3}
  dot={{ r: 5, strokeWidth: 2, stroke: "#67e8f9" }}
  activeDot={{ r: 9 }}
  filter="url(#glow)"
/>

      </LineChart>
    </ResponsiveContainer>
  );
}
