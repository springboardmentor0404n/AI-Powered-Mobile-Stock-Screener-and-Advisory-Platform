import React, { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard";
import Chatbot from "../components/Chatbot";
import VolumeDonutChart from "../components/VolumeDonutChart";
import PriceLineChart from "../components/PriceLineChart";
import "../styles/dashboard.css";
import PageTransition from "../components/PageTransition";
import Header from "../components/Header";

import Lottie from "lottie-react";
import financeAnimation from "../assets/finance.json";

export default function Dashboard({ sidebarOpen }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(10);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/dashboard/summary")
      .then((res) => res.json())
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="loading">Loading dashboard…</div>;

  const filteredPrices = data.top_10_prices?.slice(0, filter) || [];
  const filteredVolumes = data.volume_distribution?.slice(0, filter) || [];

  return (
    <PageTransition>
      <>
        {/* BACKGROUND ANIMATION */}
        <div className="dashboard-bg">
          <Lottie
            animationData={financeAnimation}
            loop
            autoplay
          />
        </div>

        {/* HEADER */}
        <Header />

        {/* CONTENT */}
        <div
          className={`main-content ${sidebarOpen ? "open" : "collapsed"}`}
          style={{ paddingTop: "72px" }}
        >
          <div className="dashboard-wrapper">
            <div className="analytics-hero">
              <div>
                <h1>Analytics Overview</h1>
                <p>AI-driven insights from uploaded stock data</p>
              </div>

              <select
                className="filter-select"
                value={filter}
                onChange={(e) => setFilter(Number(e.target.value))}
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={filteredPrices.length}>All</option>
              </select>
            </div>

            <div className="metrics-row">
              <MetricCard title="Total Stocks" value={data.total_stocks} />
              <MetricCard title="Average Price" value={`₹${data.average_price}`} />
              <MetricCard title="Highest Price" value={`₹${data.highest_price}`} />
              <MetricCard title="Market Status" value={data.market_status} />
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <h3>Volume Distribution</h3>
                <VolumeDonutChart data={filteredVolumes} />
              </div>

              <div className="chart-card wide">
                <h3>Market Price Trend</h3>
                <PriceLineChart data={filteredPrices} />
              </div>
            </div>
          </div>

          <Chatbot />
        </div>
      </>
    </PageTransition>
  );
}
