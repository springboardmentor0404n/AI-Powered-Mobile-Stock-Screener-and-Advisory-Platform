// TopStocksBar.jsx

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid, LabelList
} from "recharts";
import { alpha, Box, Typography } from "@mui/material";
import { useWatchlistStore } from "../../store/useWatchlistStore";
import { useToast } from "../../components/ToastProvider";

export default function TopStocksBar({ data, onBarClick }) {
  const addToWatchlist = useWatchlistStore((s) => s.addToWatchlist);
  const isWatching = useWatchlistStore((s) => s.isWatching);
  const toast = useToast();

  if (!data?.length) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <Typography variant="caption" fontWeight={800}>
          SYNCING LIVE MARKET DATA...
        </Typography>
      </Box>
    );
  }

  const chartData = [...data]
    .map((d) => ({ ...d, displayPrice: Number(d.price || d.close || 0) }))
    .sort((a, b) => b.displayPrice - a.displayPrice)
    .slice(0, 6);

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={700}>
      <BarChart data={chartData} margin={{ top: 50, right: 30, left: 20, bottom: 120 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />

        <XAxis
          dataKey="symbol"
          angle={-90}
          textAnchor="end"
          interval={0}
          height={100}
          tick={{ fontSize: 13, fontWeight: 900 }}
        />

        <YAxis
          tickFormatter={(v) => `₹${v.toLocaleString()}`}
          tick={{ fontSize: 12, fontWeight: 700 }}
        />

        <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />

        <Bar
          dataKey="displayPrice"
          radius={[12, 12, 0, 0]}
          barSize={70} // 🔥 spacing improvement
        >
          <LabelList
            dataKey="displayPrice"
            position="top"
            angle={-90}
            offset={25}
            formatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
          />

          {chartData.map((e, i) => (
            <Cell
              key={i}
              fill={isWatching(e.symbol) ? "#10b981" : "#6366f1"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
  