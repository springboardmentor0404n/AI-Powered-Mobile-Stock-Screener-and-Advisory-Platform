
import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import AuthLayout from "../components/AuthLayout";

function VerifyOtp() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!email || !otp) {
      alert("Email and OTP are required");
      return;
    }

    setLoading(true);

    try {
      await apiRequest("/auth/verify-otp", "POST", {
        email,
        otp
      });

      alert("OTP verified successfully!");
      navigate("/login");
    } catch (err) {
      alert(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Verify OTP"
      subtitle="Enter the OTP sent to your email"
      bgClass="otp-bg"
    >
      <input
        className="auth-input"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="auth-input"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />

      <button
        className="auth-btn btn-verify"
        onClick={handleVerify}
        disabled={loading}
      >
        {loading ? "Verifying..." : "Verify OTP"}
      </button>
    </AuthLayout>
  );
}

export default VerifyOtp;
