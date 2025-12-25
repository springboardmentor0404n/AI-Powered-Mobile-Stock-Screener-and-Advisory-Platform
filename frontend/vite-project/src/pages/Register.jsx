import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stack, TextField, Button, Typography } from "@mui/material";
import AuthLayout from "../components/AuthLayout";
import api from "../services/api";
import { useToast } from '../components/ToastProvider';

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const toast = useToast();

  const register = async () => {
    setError("");
    try {
      await api.post("/auth/register", form);
      navigate(`/verify-otp?email=${encodeURIComponent(form.email)}`);
    } catch (e) {
      const message = e.response?.data?.error || "Registration failed";
      setError(message);
      toast?.showToast(message, 'error');
    }
  };

  return (
    <AuthLayout title="Create Account">
      <Stack spacing={2}>
        <TextField label="Username" fullWidth value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <TextField label="Email" fullWidth value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <TextField label="Password" type="password" fullWidth value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <Button variant="contained" size="large" onClick={register}>Register</Button>

        {error && <Typography color="error">{error}</Typography>}
      </Stack>
    </AuthLayout>
  );
}
