import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const COLORS = ["#22c55e", "#3b82f6", "#ec4899", "#f59e0b"];

export default function VolumeDonutChart({ data = [] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="empty-chart">
        No volume data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
  data={data}
  dataKey="volume"
  nameKey="name"
  innerRadius={70}
  outerRadius={110}
  paddingAngle={4}
  animationBegin={200}
  animationDuration={900}
>
  {data.map((_, i) => (
    <Cell
      key={i}
      fill={COLORS[i % COLORS.length]}
      style={{
        filter: "drop-shadow(0px 0px 6px rgba(34,211,238,0.6))",
        cursor: "pointer",
        transition: "transform 0.3s ease",
      }}
    />
  ))}
</Pie>

        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
