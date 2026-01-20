import { useEffect, useState, useRef } from "react";
import axios from "../utils/axios"; // or correct relative path


export default function NotificationBell() {
  const [count, setCount] = useState(0);          // backend unread count
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
  fetchAlerts();

  const interval = setInterval(fetchAlerts, 20000);
  return () => clearInterval(interval);
}, []);

  // -------------------------
  // Fetch unread count
  // -------------------------
  // const fetchCount = async () => {
  //   try {
  //     const res = await axios.get("/alerts/unread/count");
  //     setCount(res.data.count ?? 0);
  //   } catch {
  //     setCount(0);
  //   }
  // };

  // -------------------------
  // Fetch alerts list
  // -------------------------
  const fetchAlerts = async () => {
  const res = await axios.get("/alerts");

  setAlerts(prevAlerts => {
    return res.data.map(alert => {
      const existing = prevAlerts.find(a => a.id === alert.id);

      // If already read locally, never revert
      if (existing && existing.is_read) {
        return { ...alert, is_read: true };
      }

      return alert;
    });
  });
};


  const unreadCount = alerts.filter(a => !a.is_read).length;
  const visibleAlerts = alerts.filter(alert =>
  alert.alert_type !== "system" &&
  !alert.message.toLowerCase().includes("test alert")
);


const markAlertsAsRead = async () => {
  const unreadAlerts = alerts.filter(a => !a.is_read);

  if (unreadAlerts.length === 0) return;

  await Promise.all(
    unreadAlerts.map(alert =>
     axios.post(`/alerts/read/${alert.id}`)
    )
  );

  // Update local state to reflect backend change
  setAlerts(prev =>
    prev.map(a => ({ ...a, is_read: true }))
  );
};

const toggleOpen = async () => {
  setOpen(prev => {
    const next = !prev;
    if (next) {
      markAlertsAsRead();
    }
    return next;
  });
};

    
  return (
    <div ref={ref} className="relative z-[10000] flex items-center">
      {/* 🔔 Bell Button */}
      <button
  onClick={toggleOpen}
  className="relative text-xl text-white hover:scale-105 transition"
  aria-label="Notifications"
>
  🔔
  {unreadCount > 0 && (
    <span className="notification-badge">
      {unreadCount}
    </span>
  )}
</button>


      {/* 📥 Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] bg-[#0b1220] rounded-2xl shadow-2xl border border-slate-700 z-[10000]">

         <div className="px-5 py-3 text-sm font-semibold text-slate-100 border-b border-slate-700 flex items-center gap-2 bg-[#020617]">
  🔔 Notifications
</div>



          <div className="max-h-64 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">
                No notifications
              </p>
            ) : (
              visibleAlerts.map((alert) => (

                <div
  key={alert.id}
  className={`notification-alert ${!alert.is_read ? "unread" : ""}`}
>
  <span className="block break-words">
  {alert.message}
</span>

</div>

              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
