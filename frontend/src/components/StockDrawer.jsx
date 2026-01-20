import Analytics from "../pages/Analytics";
import Watchlist from "../pages/Watchlist";
import Portfolio from "../pages/Portfolio";
import "./stockDrawer.css";

export default function StockDrawer({
  open,
  onClose,
  activeTab,
  setActiveTab
}) {
  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />

      <aside className="stock-drawer">
        <div className="drawer-header">
          <h2>Stocks</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="drawer-tabs">
          {["analytics", "watchlist", "portfolio", "mywatchlist"].map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="drawer-content">
          {activeTab === "analytics" && <Analytics />}
          {activeTab === "watchlist" && <Watchlist />}
          {activeTab === "portfolio" && <Portfolio />}
          {activeTab === "mywatchlist" && <MyWatchlist />}
        </div>
      </aside>
    </>
  );
}
