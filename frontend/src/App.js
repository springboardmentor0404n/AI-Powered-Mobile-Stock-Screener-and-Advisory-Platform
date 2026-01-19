import React from "react";
import { Routes, Route } from "react-router-dom";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import Chat from "./components/Chat";
import Watchlist from "./components/Watchlist"; // ✅ ADD THIS
import GoLive from "./components/GoLive";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/watchlist" element={<Watchlist />} />
      <Route path="/live" element={<GoLive />} />
    </Routes>
  );
}

export default App;
