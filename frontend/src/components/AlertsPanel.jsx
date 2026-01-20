import { useEffect, useState } from "react";
import axios from "axios";

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    axios.get("/alerts").then(res => setAlerts(res.data));
  }, []);

  return (
    <div className="alerts-panel">
      <h3>🔔 Alerts</h3>
      {alerts.map(a => (
        <div key={a.id} className={`alert ${a.is_read ? "read" : ""}`}>
          <strong>{a.symbol}</strong>
          <p>{a.message}</p>
        </div>
      ))}
    </div>
  );
}
