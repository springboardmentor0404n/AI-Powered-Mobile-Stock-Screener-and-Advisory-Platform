import React, { useEffect, useRef, useState } from "react";
import { createChart, CrosshairMode } from "lightweight-charts";
import "./GoLive.css";

export default function GoLive() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  const [symbol, setSymbol] = useState("TCS");
  const [input, setInput] = useState("TCS");
  const [interval, setInterval] = useState("1m");

  // CREATE CHART
  useEffect(() => {
    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 520,
      layout: { background: { color: "#fff" }, textColor: "#111" },
      grid: { vertLines: { color: "#eee" }, horzLines: { color: "#eee" } },
      crosshair: { mode: CrosshairMode.Normal },
    });

    seriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: "#16a34a",
      downColor: "#dc2626",
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });

    return () => chartRef.current.remove();
  }, []);

  // FETCH DATA
// SMART LIVE UPDATE (only latest candle)
useEffect(() => {
  let timer;
  let lastCandleTime = null;

  const fetchData = () => {
    fetch(`http://localhost:5001/live/candles/${symbol}?interval=${interval}`)
      .then(res => res.json())
      .then(data => {
        if (!data?.candles?.length) return;

        const candles = data.candles.map(c => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

        // FIRST LOAD → set full data
        if (!lastCandleTime) {
          seriesRef.current.setData(candles);
          lastCandleTime = candles[candles.length - 1].time;
          chartRef.current.timeScale().fitContent();
          return;
        }

        // SMART UPDATE → only last candle
        const latest = candles[candles.length - 1];

        if (latest.time >= lastCandleTime) {
          seriesRef.current.update(latest);
          lastCandleTime = latest.time;
        }
      })
      .catch(console.error);
  };

  fetchData(); // initial load
  timer = setInterval(fetchData, 10000); // ⏱️ every 10 sec

  return () => clearInterval(timer);
}, [symbol, interval]);


  return (
    <div className="live-root">
      <h2>📈 {symbol} Candlestick Chart</h2>

      {/* SEARCH */}
      <form
        className="search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          setSymbol(input.toUpperCase());
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <button>Load</button>
      </form>

      {/* INTERVALS */}
      <div className="interval-bar">
        {[
          ["1m", "1m"],
          ["5m", "5m"],
          ["15m", "15m"],
          ["1D", "1d"],
          ["1W", "1w"],
          ["1M", "1mo"],
        ].map(([label, val]) => (
          <button
            key={val}
            className={interval === val ? "active" : ""}
            onClick={() => setInterval(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* CHART */}
      <div className="chart-box">
        <div ref={chartContainerRef} className="chart-container" />
      </div>
    </div>
  );
}
