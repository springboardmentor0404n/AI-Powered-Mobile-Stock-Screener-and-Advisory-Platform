import React from "react";
import { NavLink } from "react-router-dom";
import { MdDashboard, MdAnalytics } from "react-icons/md";
import { AiOutlineStar } from "react-icons/ai";
import { BsBriefcase } from "react-icons/bs";
import "../styles/sidebar.css";

export default function Sidebar({ sidebarOpen }) {
  return (
    <aside className={`sidebar ${sidebarOpen ? "expanded" : "collapsed"}`}>
      <div className="sidebar-inner">
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className="nav-item">
            <MdDashboard className="nav-icon" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/analytics" className="nav-item">
            <MdAnalytics className="nav-icon" />
            <span>Analytics</span>
          </NavLink>

          <NavLink to="/watchlist" className="nav-item">
            <AiOutlineStar className="nav-icon" />
            <span>Watchlist</span>
          </NavLink>

          <NavLink to="/portfolio" className="nav-item">
            <BsBriefcase className="nav-icon" />
            <span>Portfolio</span>
          </NavLink>
        </nav>
      </div>
    </aside>
  );
}
