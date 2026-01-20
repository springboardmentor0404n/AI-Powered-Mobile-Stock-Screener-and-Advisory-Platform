import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Email and password required");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Login failed");
      }

      const res = await response.json();

      // ✅ Save JWT
      localStorage.setItem("token", res.access_token);

      alert("Login successful");
      navigate("/dashboard");
    } catch (err) {
      alert(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Login to your account"
      bgClass="login-bg"
    >
      <input
        className="auth-input"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="auth-input"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="auth-btn btn-login" onClick={handleLogin}>
        {loading ? "Logging in..." : "Login"}
      </button>

      <p style={{ marginTop: "15px", fontSize: "14px" }}>
        New user?{" "}
        <Link className="auth-link" to="/signup">
          Create account
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
