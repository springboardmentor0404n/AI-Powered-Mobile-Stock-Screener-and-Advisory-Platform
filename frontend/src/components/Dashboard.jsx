import React, { useEffect, useMemo, useState } from "react";
import { Pie, Doughnut, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
} from "chart.js";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import { Avatar } from "@mui/material";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement
);

const PIE_COLORS = [
  "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed",
  "#0891b2", "#ea580c", "#4f46e5", "#22c55e", "#0ea5e9",
  "#9333ea", "#059669", "#f97316", "#0ea5e9", "#22c55e",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "U";

  const [rows, setRows] = useState(null);
  const [query, setQuery] = useState("");
  const [lineRange, setLineRange] = useState("1M");

  /* 🔔 ALERT STATES */
  const [alerts, setAlerts] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);

  // ---------------- FETCH DASHBOARD ----------------
  useEffect(() => {
    fetch("http://localhost:5001/dashboard/insights")
      .then(res => res.json())
      .then(data => setRows(data.marketData || []))
      .catch(() => setRows([]));
  }, []);

  /* ---------------- FETCH ALERTS ---------------- */
  useEffect(() => {
    const loadAlerts = () => {
      fetch("http://localhost:5001/alerts")
        .then(res => res.json())
        .then(data => {
          setAlerts(data.alerts || []);
          setUnread(data.unread_count || 0);
        });
    };

    loadAlerts();
    const timer = setInterval(loadAlerts, 15000);
    return () => clearInterval(timer);
  }, []);

  const markRead = (id) => {
    fetch("http://localhost:5001/alerts/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).then(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
      setUnread(u => Math.max(0, u - 1));
    });
  };

  // ---------------- GROUP ----------------
  const grouped = useMemo(() => {
    if (!rows) return [];
    const map = {};
    rows.forEach(r => {
      if (!map[r.Symbol]) {
        map[r.Symbol] = { Symbol: r.Symbol, Volume: 0, Turnover: 0, Close: 0, count: 0 };
      }
      map[r.Symbol].Volume += +r.Volume || 0;
      map[r.Symbol].Turnover += +r.Turnover || 0;
      map[r.Symbol].Close += +r.Close || 0;
      map[r.Symbol].count++;
    });
    return Object.values(map).map(x => ({
      ...x,
      avgClose: x.Close / x.count,
    }));
  }, [rows]);

  const selected = useMemo(() => {
    if (!query) return null;
    return grouped.find(g => g.Symbol.toLowerCase() === query.toLowerCase());
  }, [query, grouped]);

  // ---------------- WATCHLIST ----------------
  const addToWatchlist = (item) => {
    const list = JSON.parse(localStorage.getItem("watchlist")) || [];
    if (!list.find(x => x.Symbol === item.Symbol)) {
      list.push(item);
      localStorage.setItem("watchlist", JSON.stringify(list));
    }
    navigate("/watchlist");
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

 // ---------------- PIE / DONUT DATA ---------------- 
 const pieDonutSource = useMemo(() => { if (!selected) { return [...grouped].sort((a, b) => b.Volume - a.Volume).slice(0, 15); } const rest = grouped.filter(g => g.Symbol !== selected.Symbol); return [ selected, { Symbol: "Rest of Market", Volume: rest.reduce((s, r) => s + r.Volume, 0), Turnover: rest.reduce((s, r) => s + r.Turnover, 0), avgClose: rest.reduce((s, r) => s + r.avgClose, 0) / rest.length, }, ]; }, [grouped, selected]); const pieData = { labels: pieDonutSource.map(x => x.Symbol), datasets: [{ data: pieDonutSource.map(x => x.Volume), backgroundColor: PIE_COLORS, borderWidth: 0, hoverOffset: 6, }], }; const donutData = { labels: pieDonutSource.map(x => x.Symbol), datasets: [{ data: pieDonutSource.map(x => x.Turnover), backgroundColor: PIE_COLORS, borderWidth: 0, hoverOffset: 6, }], }; 
 // 🎯 ONLY VISUAL OPTIONS 
 const pieDonutOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111827", titleColor: "#ffffff", bodyColor: "#e5e7eb", padding: 10, cornerRadius: 6, }, }, layout: { padding: 10 }, }; 
 // ---------------- BAR ---------------- 
 const barData = { labels: pieDonutSource.map(x => x.Symbol), datasets: [{ label: "Avg Close", data: pieDonutSource.map(x => x.avgClose), backgroundColor: "#2563eb", }], }; 
 // ---------------- LINE ---------------- 
 const rangeDays = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "3Y": 1095, "5Y": 1825 }; const lineData = useMemo(() => { if (!rows?.length) return { labels: [], datasets: [] }; const src = selected ? rows.filter(r => r.Symbol === selected.Symbol) : rows; const sorted = [...src].sort((a, b) => new Date(a.Date) - new Date(b.Date)); const lastDate = new Date(sorted.at(-1).Date); const cutoff = new Date(lastDate); cutoff.setDate(cutoff.getDate() - rangeDays[lineRange]); const filtered = sorted.filter(r => new Date(r.Date) >= cutoff); const values = selected ? filtered.map(r => +r.Close) : filtered.reduce((acc, r, i) => { acc[i] = (acc[i] || 0) + (+r.Close || 0); return acc; }, []).map(v => v / grouped.length); return { labels: filtered.map(r => r.Date), datasets: [{ label: selected ? `${selected.Symbol} Close` : "Market Average Close", data: values, borderColor: "#16a34a", backgroundColor: "rgba(22,163,74,0.15)", tension: 0.4, pointRadius: 2, fill: true, }], }; }, [rows, selected, lineRange, grouped.length]); const top10 = [...grouped].sort((a, b) => b.Turnover - a.Turnover).slice(0, 10); if (!rows) return <div className="loading">Loading Dashboard…</div>;

  return (
    <div className="dashboard-root">
      {/* 🔔 TOP BAR */}
      <div className="topbar">
        <h1>StockGenius</h1>
        <div className="top-actions">
          <div className="alert-bell" onClick={() => setShowAlerts(true)}>
            🔔{unread > 0 && <span className="alert-badge">{unread}</span>}
          </div>
          <button onClick={() => navigate("/live")}>📈 Go Live</button>
          <button onClick={() => navigate("/watchlist")}>Watchlist</button>
          <Avatar>{username.charAt(0)}</Avatar>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {/* 🔔 ALERT SLIDE PANEL */}
      {showAlerts && <div className="alert-overlay" onClick={() => setShowAlerts(false)} />}
      <div className={`alert-slide ${showAlerts ? "open" : ""}`}>
        <div className="alert-header">
          <h3>Notifications</h3>
          <span onClick={() => setShowAlerts(false)}>✕</span>
        </div>

        {alerts.filter(a => !a.is_read).map(a => (
          <div key={a.id} className="alert-item unread" onClick={() => markRead(a.id)}>
            <strong>{a.symbol}</strong>
            <p>{a.message}</p>
          </div>
        ))}
      </div>

      {/* KPI ROW */}
      <div className="kpi-row">
        <div className="kpi-card"><span>Total Companies</span><h2>{grouped.length}</h2></div>
        <div className="kpi-card"><span>Total Volume</span><h2>{(grouped.reduce((s, g) => s + g.Volume, 0) / 1e7).toFixed(2)} Cr</h2></div>
        <div className="kpi-card"><span>Total Turnover</span><h2>{(grouped.reduce((s, g) => s + g.Turnover, 0) / 1e7).toFixed(2)} Cr</h2></div>
        <div className="kpi-card"><span>Avg Market Close</span><h2>{(grouped.reduce((s, g) => s + g.avgClose, 0) / grouped.length).toFixed(2)}</h2></div>
      </div>

      <div className="search-row">
        <input placeholder="Search symbol" value={query} onChange={e => setQuery(e.target.value)} />
        {selected && <button onClick={() => addToWatchlist(selected)}>➕ Watchlist</button>}
      </div>

      <div className="charts-grid two">
        <div className="card">
          <h3>Volume Distribution</h3>
          <div style={{ height: 240 }}>
            <Pie data={pieData} options={pieDonutOptions} />
          </div>
        </div>

        <div className="card">
          <h3>Turnover Distribution</h3>
          <div style={{ height: 240 }}>
            <Doughnut data={donutData} options={{ ...pieDonutOptions, cutout: "65%" }} />
          </div>
        </div>
      </div>

      <div className="charts-grid two">
        <div className="card"><h3>Average Close Comparison</h3><Bar data={barData} /></div>
        <div className="card">
          <h3>Close Trend</h3>
          <div className="timeframe-bar">
            {Object.keys(rangeDays).map(r => (
              <button key={r} className={lineRange === r ? "active" : ""} onClick={() => setLineRange(r)}>{r}</button>
            ))}
          </div>
          <Line data={lineData} />
        </div>
      </div>

      <div className="card table-card">
        <h3>Top 10 Companies by Turnover</h3>
        <table>
          <thead>
            <tr><th>#</th><th>Symbol</th><th>Turnover</th><th>Avg Close</th><th></th></tr>
          </thead>
          <tbody>
            {top10.map((x, i) => (
              <tr key={x.Symbol}>
                <td>{i + 1}</td>
                <td>{x.Symbol}</td>
                <td>{(x.Turnover / 1e7).toFixed(2)} Cr</td>
                <td>{x.avgClose.toFixed(2)}</td>
                <td><button onClick={() => addToWatchlist(x)}>➕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="chat-fab" onClick={() => navigate("/chat")}>🤖</button>
    </div>
  );
}
