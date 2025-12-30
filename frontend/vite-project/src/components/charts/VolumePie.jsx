// VolumePie.jsx

import {
  PieChart, Pie, Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";

const COLORS = ["#00b8d9", "#6366f1", "#ffab00", "#36b37e", "#ff5630"];

export default function VolumePie({ data }) {
  if (!data?.length) return null;

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={350}>
      <PieChart>
        <Pie
          data={data}
          dataKey="volume"
          nameKey="symbol"
          cx="50%"
          cy="42%"
          innerRadius="68%"
          outerRadius="92%"
          paddingAngle={4}
          label={({ percent }) =>
            percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ""
          }
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>

        <Tooltip formatter={(v) => `${v.toLocaleString()} units`} />

        <Legend verticalAlign="bottom" align="center" />
      </PieChart>
    </ResponsiveContainer>
  );
}
