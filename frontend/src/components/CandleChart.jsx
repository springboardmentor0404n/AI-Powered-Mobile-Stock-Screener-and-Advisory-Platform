import React, { useEffect, useRef } from "react";

/* ---------------- DEMO FALLBACK ---------------- */
function DemoCandleChart() {
  return (
    <div
      style={{
        height: "320px",
        borderRadius: "14px",
        background: "linear-gradient(180deg, #020617, #0b1220)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#9ca3af",
        fontSize: "15px",
      }}
    >
      📊 Demo candle chart (waiting for real market data)
    </div>
  );
}

/* ---------------- MAIN ---------------- */
export default function CandleChart({ symbol }) {
  const containerRef = useRef(null);

  // ✅ If no stock selected → demo
  if (!symbol) {
    return <DemoCandleChart />;
  }

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    // Prevent duplicate script load
    if (!window.TradingView) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = renderChart;
      document.body.appendChild(script);
    } else {
      renderChart();
    }

    function renderChart() {
      new window.TradingView.widget({
        container_id: containerRef.current.id,
        symbol: symbol,        // 🔥 THIS IS ALL THAT MATTERS
        interval: "D",
        theme: "dark",
        style: "1",
        locale: "en",
        hide_top_toolbar: true,
        hide_legend: true,
        enable_publishing: false,
        autosize: true,
      });
    }
  }, [symbol]);

  return (
    <div
      id={`tv-${symbol}`}
      ref={containerRef}
      style={{ height: "320px", borderRadius: "12px" }}
    />
  );
}
