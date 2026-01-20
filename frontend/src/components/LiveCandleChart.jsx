import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";

export default function LiveCandleChart({ symbol }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!symbol || !ref.current) return;

    const chart = createChart(ref.current, {
      height: 320,
      layout: { background: { color: "#0b1020" }, textColor: "#d1d4dc" },
      grid: { vertLines: { color: "#1f2a40" }, horzLines: { color: "#1f2a40" } },
      timeScale: { timeVisible: true }
    });

    const series = chart.addSeries(CandlestickSeries);

    fetch(`http://127.0.0.1:8000/live/candles/${symbol}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) {
          console.error("Bad data", data);
          return;
        }
        series.setData(data);
        chart.timeScale().fitContent();
      })
      .catch(console.error);

    return () => chart.remove();
  }, [symbol]);

  return <div ref={ref} style={{ width: "100%" }} />;
}
