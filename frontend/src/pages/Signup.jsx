import React from "react";
import { useState } from "react";
import apiRequest from "../services/api";
import AuthLayout from "../components/AuthLayout";
import { Link, useNavigate } from "react-router-dom";

function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    try {
      await apiRequest("/auth/register", "POST", form);
      alert("OTP sent to email");
      navigate("/verify-otp", { state: { email: form.email } });
    } catch (err) {
      alert(err.message || "Signup failed");
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Signup to continue"
      bgClass="signup-bg"
    >
      <input
        className="auth-input"
        name="username"
        placeholder="Full Name"
        value={form.username}
        onChange={handleChange}
      />

      <input
        className="auth-input"
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
      />

      <input
        className="auth-input"
        type="password"
        name="password"
        placeholder="Password"
        value={form.password}
        onChange={handleChange}
      />

      <button className="auth-btn btn-signup" onClick={handleSignup}>
        Sign Up
      </button>

      <p style={{ marginTop: "15px", fontSize: "14px" }}>
        Already have an account?{" "}
        <Link className="auth-link" to="/">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Signup;
