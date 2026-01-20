import { useEffect, useState } from "react";
import TopPriceTable from "../components/TopPriceTable";
import WatchlistCharts from "../components/WatchlistCharts";
import apiRequest from "../services/api";
import { usePortfolio } from "../context/PortfolioContext";
import PageTransition from "../components/PageTransition";

export default function Watchlist({ sidebarOpen }) {
  const [data, setData] = useState([]);
  const { addToPortfolio } = usePortfolio();

  const normalize = (s) =>
    String(s || "").replace(".NS", "").replace(".BO", "");

  const load = async () => {
    let watchlist = [];

    try {
      const res = await apiRequest("/market/watchlist");
      watchlist = Array.isArray(res)
        ? res
        : Array.isArray(res?.symbols)
        ? res.symbols.map((s) => ({ symbol: s }))
        : [];
    } catch {}

    const baseRows = watchlist.map((w) => ({
      symbol: w.symbol,
      price: 0,
      volume: 0,
      onBuy: () =>
        addToPortfolio({
          symbol: w.symbol,
          price: 0,
          quantity: 1,
        }),
    }));

    setData(baseRows);

    try {
      const dashboard = await apiRequest("/dashboard/summary");
      const volumeMap = {};
      dashboard?.volume_distribution?.forEach((v) => {
        volumeMap[normalize(v.name)] = Number(v.volume) || 0;
      });

      setData((prev) =>
        prev.map((row) => ({
          ...row,
          volume: volumeMap[normalize(row.symbol)] ?? 0,
        }))
      );
    } catch {}
  };

  useEffect(() => {
    load();
  }, []);

  return (
  <PageTransition>
    <div className={`main-content ${sidebarOpen ? "open" : "collapsed"}`}>
      <div className="page-wrapper">
        <h3>My Watchlist</h3>
        <TopPriceTable data={data} />
        <WatchlistCharts data={data} />
      </div>
    </div>
  </PageTransition>
);
}
