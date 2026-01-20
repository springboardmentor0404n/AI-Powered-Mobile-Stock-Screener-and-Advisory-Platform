import React, { useEffect, useState, useMemo } from "react";
import apiRequest from "../services/api";
import PortfolioTable from "../components/PortfolioTable";
import CandleChart from "../components/CandleChart";
import PageTransition from "../components/PageTransition";
import { motion } from "framer-motion";
import "../styles/portfolio.css";
import LiveMarketChart from "../components/LiveMarketChart";

export default function Portfolio() {
  const [rows, setRows] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  /* ===============================
     LOAD PORTFOLIO (UNCHANGED API)
     =============================== */
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const data = await apiRequest("/portfolio/portfolio");

        const enriched = data.map((stock) => ({
          ...stock,
          quantity: stock.quantity ?? stock.qty ?? 0,
          current_price: stock.current_price ?? stock.buy_price,
        }));

        setRows(enriched);
        setSelectedSymbol(enriched?.[0]?.symbol || null);
      } catch (err) {
        console.error("Portfolio load failed:", err);
        setRows([]);
      }
    };

    loadPortfolio();
  }, []);

  /* ===============================
     TOTAL P&L (NO DAY GAIN)
     =============================== */
  const pnlSummary = useMemo(() => {
    let invested = 0;
    let current = 0;

    rows.forEach((r) => {
      const qty = Number(r.quantity || 0);
      const buy = Number(r.buy_price || 0);
      const curr = Number(r.current_price || buy);

      invested += qty * buy;
      current += qty * curr;
    });

    const totalPnl = current - invested;
    const totalPercent = invested ? (totalPnl / invested) * 100 : 0;

    return { invested, current, totalPnl, totalPercent };
  }, [rows]);

  const isProfit = pnlSummary.totalPnl >= 0;

  return (
    <PageTransition>
      <motion.div
        className="page-wrapper"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="portfolio-card">
          {/* HEADER */}
          <div className="portfolio-header">
            <h2>My Portfolio</h2>
            <p>Your long-term investments overview</p>
          </div>

          {/* ===== P&L SUMMARY ===== */}
          <div className="pl-cards">
            <div className="pl-card">
              <span>Invested</span>
              <h3>₹{pnlSummary.invested.toLocaleString()}</h3>
            </div>

            <div className="pl-card">
              <span>Current Value</span>
              <h3>₹{pnlSummary.current.toLocaleString()}</h3>
            </div>

            <div className={`pl-card ${isProfit ? "profit" : "loss"}`}>
              <span>Total P&amp;L</span>
              <h3>
                {pnlSummary.totalPnl >= 0 ? "+" : "-"}₹
                {Math.abs(pnlSummary.totalPnl).toLocaleString()}
              </h3>
              <p>{pnlSummary.totalPercent.toFixed(2)}%</p>
            </div>
          </div>

          {/* ===== PORTFOLIO PERFORMANCE (FIXED) ===== */}
          <div className="portfolio-chart premium-performance">
            <div className="performance-header">
              <h3>Portfolio Performance</h3>
              <span className="performance-sub">
                Red / Green candle view based on Live Market
              </span>
            </div>

            {selectedSymbol ? (
              <CandleChart symbol={selectedSymbol} />
            ) : (
              <div className="empty-chart">
                Select a stock to view performance
              </div>
            )}
          </div>

          {/* ===== HOLDINGS ===== */}
          <div className="portfolio-grid">
            <div className="portfolio-holdings">
              <div className="portfolio-holdings-card">
                <h4 className="holdings-title">Holdings</h4>
                <PortfolioTable data={rows} onSelect={setSelectedSymbol} />
              </div>
            </div>
          </div>

          {/* ===== LIVE MARKET (UNCHANGED) ===== */}
          {selectedSymbol && (
            <div className="live-market-section">
              <h3 className="section-title">Holding Market</h3>
              <LiveMarketChart symbol={selectedSymbol} />
            </div>
          )}
        </div>
      </motion.div>
    </PageTransition>
  );
}
