import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Background from "./components/Background";
import Landing from "./pages/Landing";
import ToastProvider from './components/ToastProvider';
import { isAuthenticated } from "./utils/auth";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";
import Dashboard from "./pages/Dashboard";
import UploadCSV from "./pages/UploadCSV";
import Chat from "./pages/Chat";

const PrivateRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Background />
        <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />

        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/upload" element={<PrivateRoute><UploadCSV /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
