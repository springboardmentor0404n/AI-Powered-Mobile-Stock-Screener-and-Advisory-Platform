import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import "../styles/analytics.css";

export default function StockTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("none");
  const [pinned, setPinned] = useState(new Set());

  // Fetch market analytics data
  useEffect(() => {
    apiRequest("/analytics/stocks/table")
      .then(res => setData(res))
      .finally(() => setLoading(false));
  }, []);

  // Load pinned symbols
  useEffect(() => {
    apiRequest("/market/watchlist").then(res => {
      setPinned(new Set(res.map(s => s.symbol)));
    });
  }, []);

  const togglePin = async (symbol) => {
    await apiRequest(`/market/watchlist/toggle?symbol=${symbol}`, "POST");

    setPinned(prev => {
      const copy = new Set(prev);
      copy.has(symbol) ? copy.delete(symbol) : copy.add(symbol);
      return copy;
    });

    window.dispatchEvent(new Event("watchlist-updated"));
  };

  const filtered = data
    .filter(r =>
      r.symbol.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (pinned.has(a.symbol)) return -1;
      if (pinned.has(b.symbol)) return 1;

      if (sortBy === "price") return (b.close ?? 0) - (a.close ?? 0);
      if (sortBy === "volume") return (b.volume ?? 0) - (a.volume ?? 0);
      return 0;
    });

  if (loading) return <p className="loading">Loading stocks…</p>;

  return (
    <div className="analytics-card">
      <h2 className="analytics-title">📊 Market Analytics</h2>

      <div className="analytics-toolbar">
        <input
          className="search-input"
          placeholder="Search stock (TCS, INFY)"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          className="sort-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="none">No Sorting</option>
          <option value="price">Sort by Price</option>
          <option value="volume">Sort by Volume</option>
        </select>
      </div>

      <table className="stock-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Open</th>
            <th>Close</th>
            <th>Volume</th>
            <th>Pin</th>
            <th>Buy</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map(row => (
            <tr
              key={row.symbol}
              className={pinned.has(row.symbol) ? "pinned-row" : ""}
            >
              <td>{row.symbol}</td>
              <td>₹{row.open ?? "-"}</td>
              <td>₹{row.close ?? row.open ?? "-"}</td>
              <td>{row.volume ?? "-"}</td>

              <td>
                <button
                  className={`pin-btn ${pinned.has(row.symbol) ? "active" : ""}`}
                  onClick={() => togglePin(row.symbol)}
                >
                  📌
                </button>
              </td>

              <td>
                <button className="buy-btn">+</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
