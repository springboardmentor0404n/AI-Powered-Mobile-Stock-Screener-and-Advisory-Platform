import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Background from "./components/Background";
import Landing from "./pages/Landing";
import ToastProvider from "./components/ToastProvider";
import { isAuthenticated } from "./utils/auth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";
import Dashboard from "./pages/Dashboard";
import UploadCSV from "./pages/UploadCSV";
import Chat from "./pages/Chat";
import WatchlistAll from './pages/WatchlistAll'; 

// Component to protect routes from unauthenticated access
const PrivateRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        {/* Global animated background for consistent branding */}
        <Background />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />

          {/* Protected Dashboard Route */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* Protected Data Upload Route */}
          <Route
            path="/upload"
            element={
              <PrivateRoute>
                <UploadCSV />
              </PrivateRoute>
            }
          />

          {/* Protected AI Chat Route */}
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />

          {/* ✅ ADDED: Protected Full Watchlist View */}
          <Route
            path="/watchlist-all"
            element={
              <PrivateRoute>
                <WatchlistAll />
              </PrivateRoute>
            }
          />

          {/* Fallback redirect for undefined routes */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}