import { Line } from "react-chartjs-2";
import { useEffect, useState } from "react";
import apiRequest from "../services/api";

export default function LiveMarketChart({ symbol }) {
  const [dataPoints, setDataPoints] = useState([]);

  useEffect(() => {
    if (!symbol) return;

    const fetchData = async () => {
      try {
        const res = await apiRequest(`/market/history/${symbol}`);

        // ✅ SAFE NORMALIZATION
        if (Array.isArray(res)) {
          setDataPoints(res);
        } else if (res?.candles && Array.isArray(res.candles)) {
          setDataPoints(res.candles);
        } else {
          setDataPoints([]);
        }
      } catch (err) {
        console.error("Live market fetch failed:", err);
        setDataPoints([]);
      }
    };

    fetchData();
  }, [symbol]);

  // ✅ PREVENT CRASH
  if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
    return (
      <div className="empty-chart">
        No live market data available
      </div>
    );
  }

  const chartData = {
    labels: dataPoints.map(p => p.time || p.timestamp),
    datasets: [
      {
        label: symbol,
        data: dataPoints.map(p => p.price || p.close),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.2)",
      },
    ],
  };

  return <Line data={chartData} />;
}
