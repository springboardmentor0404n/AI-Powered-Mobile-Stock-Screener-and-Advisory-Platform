import { Line } from "react-chartjs-2";

export default function PortfolioPerformanceChart({ invested, current }) {
  const profit = current - invested;
  const color = profit >= 0 ? "green" : "red";

  const data = {
    labels: ["Invested", "Current"],
    datasets: [
      {
        label: "Portfolio Value",
        data: [invested, current],
        borderColor: color,
        backgroundColor: color,
      },
    ],
  };

  return <Line data={data} />;
}
