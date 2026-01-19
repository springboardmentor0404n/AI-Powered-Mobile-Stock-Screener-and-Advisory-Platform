import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import "./Watchlist.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

export default function Watchlist() {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [marketData, setMarketData] = useState([]);
  const [expanded, setExpanded] = useState(null);

  // 🌗 THEME STATE (ONLY ADDITION)
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ---------------- LOAD WATCHLIST ----------------
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("watchlist")) || [];
    setWatchlist(stored);
  }, []);

  // ---------------- FETCH MARKET DATA ----------------
  useEffect(() => {
    fetch("http://localhost:5001/dashboard/insights")
      .then((res) => res.json())
      .then((data) => setMarketData(data.marketData || []))
      .catch(() => setMarketData([]));
  }, []);

  // ---------------- REMOVE ----------------
  const removeFromWatchlist = (symbol) => {
    const updated = watchlist.filter((x) => x.Symbol !== symbol);
    setWatchlist(updated);
    localStorage.setItem("watchlist", JSON.stringify(updated));
    if (expanded === symbol) setExpanded(null);
  };

  // ---------------- HELPERS ----------------
  const getCompanyRows = (symbol) =>
    marketData
      .filter((r) => r.Symbol === symbol)
      .sort((a, b) => new Date(b.Date) - new Date(a.Date));

  const getChange = (symbol) => {
    const rows = getCompanyRows(symbol);
    if (rows.length < 2) return null;

    const latest = Number(rows[0].Close);
    const prev = Number(rows[1].Close);
    if (!prev) return null;

    const diff = latest - prev;
    const percent = (diff / prev) * 100;

    return {
      diff: diff.toFixed(2),
      percent: percent.toFixed(2),
      up: diff >= 0,
    };
  };

  // ---------------- EXPANDED DATA ----------------
  const companyRows = useMemo(() => {
    if (!expanded) return [];
    return getCompanyRows(expanded);
  }, [expanded, marketData]);

  const avgClose = useMemo(() => {
    if (!companyRows.length) return 0;
    return (
      companyRows.reduce((a, b) => a + Number(b.Close), 0) /
      companyRows.length
    );
  }, [companyRows]);

  const last30 = useMemo(() => {
    return [...companyRows]
      .sort((a, b) => new Date(a.Date) - new Date(b.Date))
      .slice(-30);
  }, [companyRows]);

  // ---------------- CHART DATA ----------------
  const barData = {
    labels: [expanded],
    datasets: [
      {
        label: "Average Close",
        data: [avgClose],
        backgroundColor: "#2563eb",
      },
    ],
  };

  const lineData = {
    labels: last30.map((r) => r.Date),
    datasets: [
      {
        label: "Close Trend (30 Days)",
        data: last30.map((r) => r.Close),
        borderColor: "#16a34a",
        backgroundColor: "rgba(22,163,74,0.15)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="watchlist-root">
      <div className="watchlist-header">
        <h1>My Watchlist</h1>

        <div className="header-actions">
          {/* 🌗 THEME TOGGLE */}
          <button
            className="theme-btn"
            onClick={() =>
              setTheme(theme === "light" ? "dark" : "light")
            }
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>

          <button className="back-btn" onClick={() => navigate("/")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {!watchlist.length && (
        <p className="empty-text">No companies in watchlist</p>
      )}

      {!!watchlist.length && (
        <div className="table-card">
          <table className="watchlist-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Last Close</th>
                <th>Change</th>
                <th>Volume</th>
                <th>Turnover</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {watchlist.map((item) => {
                const rows = getCompanyRows(item.Symbol);
                const latest = rows[0] || {};
                const change = getChange(item.Symbol);

                const deliverablePercent =
                  typeof latest["%Deliverble"] === "number"
                    ? (latest["%Deliverble"] * 100).toFixed(2)
                    : "";

                return (
                  <React.Fragment key={item.Symbol}>
                    <tr
                      className="watchlist-row"
                      onClick={() =>
                        setExpanded(
                          expanded === item.Symbol ? null : item.Symbol
                        )
                      }
                    >
                      <td className="symbol">{item.Symbol}</td>
                      <td>{Number(latest.Close).toFixed(2)}</td>

                      <td>
                        {change ? (
                          <span className={change.up ? "up" : "down"}>
                            {change.up ? "▲" : "▼"} {change.diff} (
                            {change.percent}%)
                          </span>
                        ) : (
                          ""
                        )}
                      </td>

                      <td>{(Number(latest.Volume) / 1e5).toFixed(2)} L</td>
                      <td>{(Number(latest.Turnover) / 1e7).toFixed(2)} Cr</td>

                      <td>
                        <button
                          className="remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromWatchlist(item.Symbol);
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>

                    {expanded === item.Symbol && (
                      <tr className="expanded-row">
                        <td colSpan="6">
                          <div className="expanded-box">
                            <strong>{item.Symbol} Analytics</strong>

                            <div className="expanded-grid">
                              <div>
                                <span>High</span>
                                <p>{latest.High}</p>
                              </div>
                              <div>
                                <span>Low</span>
                                <p>{latest.Low}</p>
                              </div>
                              <div>
                                <span>VWAP</span>
                                <p>{latest.VWAP}</p>
                              </div>
                              <div>
                                <span>Trades</span>
                                <p>{latest.Trades}</p>
                              </div>

                              {deliverablePercent && (
                                <div>
                                  <span>Deliverable %</span>
                                  <p>{deliverablePercent}%</p>
                                </div>
                              )}
                            </div>

                            <div className="charts-row">
                              <div className="chart-card">
                                <Bar data={barData} />
                              </div>
                              <div className="chart-card">
                                <Line data={lineData} />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
