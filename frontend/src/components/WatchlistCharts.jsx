import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function WatchlistCharts({ data }) {
  if (!data || data.length === 0) return null;

  const prices = data.map((s) =>
  typeof s.price === "number" && s.price > 0 ? s.price : 0.01
);

const volumes = data.map((s) =>
  typeof s.volume === "number" && s.volume > 0 ? s.volume : 1
);

const labels = data.map((s) => s.symbol);


  return (
    <div className="watchlist-charts">
      {/* PRICE LINE CHART */}
      <div className="chart-card">
        <h4>Price Comparison</h4>
        <Line
          data={{
            labels,
            datasets: [
              {
                label: "Price (₹)",
                data: data.map(s => s.price),
                borderColor: "#22c55e",
                backgroundColor: "rgba(34,197,94,0.2)",
                tension: 0.4,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: { color: "#fff" },
              },
            },
            scales: {
              x: { ticks: { color: "#9ca3af" } },
              y: { ticks: { color: "#9ca3af" } },
            },
          }}
        />
      </div>

      {/* VOLUME DONUT CHART */}
      <div className="chart-card">
        <h4>Volume Distribution</h4>
        <Doughnut
          data={{
            labels,
            datasets: [
              {
                data: data.map(s => s.volume),
                backgroundColor: [
                  "#1d9d18ff",
                  "#2e59cdff",
                  "#f9168fff",
                  "#e25033ff",
                ],
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: { color: "#fff" },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
