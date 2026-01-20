import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationBell from "./NotificationBell";
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === "/dashboard";

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
   <header
  className={`navbar premium-navbar ${isDashboard ? "navbar-large" : "navbar-compact"} overflow-visible relative`}
>

      {/* LEFT */}
      <div className="nav-left">
      <h2 className="brand premium-brand">
  Web Stock Screener
<span>AI</span>
</h2>

      </div>

      {/* RIGHT */}
      <div className="nav-right">
        <NotificationBell />
        <div className="profile-chip">
          
          <span className="avatar">👤</span>
          <span className="username">User</span>
        </div>

        <button onClick={logout} className="logout-btn">
          Logout
        </button>
      </div>
    </header>
  );
}
