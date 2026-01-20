
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import VerifyOtp from "./pages/VerifyOtp";
import Dashboard from "./pages/Dashboard";
import Watchlist from "./pages/Watchlist";
import Portfolio from "./pages/Portfolio";
import Analytics from "./pages/Analytics";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

function Layout() {
  const location = useLocation();

  const isAuthPage =
  location.pathname === "/" ||
  location.pathname === "/signup" ||
  location.pathname === "/verify-otp";


  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ✅ Auto behavior based on route
 useEffect(() => {
  setSidebarOpen(false);
}, [location.pathname]);

  return (
    <>
      {/* TOP NAVBAR */}
{!isAuthPage && <Navbar />}

{/* SIDEBAR */}
{!isAuthPage && <Sidebar sidebarOpen={sidebarOpen} />}

      {/* PAGE TRANSITIONS */}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/analytics" element={<Analytics />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/portfolio" element={<Portfolio />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
