export default function MetricCard({ title, value, subtitle }) {
  return (
    <div className="metric-card premium">
      <p className="metric-label">{title}</p>
     <span className="market-badge bullish">{value}</span>
      {subtitle && <span className="metric-sub">{subtitle}</span>}
    </div>
  );
}
