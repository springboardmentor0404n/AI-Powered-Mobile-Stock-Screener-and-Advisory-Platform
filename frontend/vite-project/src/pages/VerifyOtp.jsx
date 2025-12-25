import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Stack, TextField, Button, Typography } from "@mui/material";
import AuthLayout from "../components/AuthLayout";
import api from "../services/api";
import { useToast } from '../components/ToastProvider';
import { saveToken } from "../utils/auth";

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get("email");
  const toast = useToast();

  const verify = async () => {
    try {
      const res = await api.post("/auth/verify-otp", { email, otp });
      const token = res?.data?.access_token;
      if (token) {
        saveToken(token);
        navigate("/dashboard");
        return;
      }
      // fallback to login if token not present
      navigate("/");
    } catch (e) {
      const message = e.response?.data?.error || 'Verification failed';
      toast?.showToast(message, 'error');
    }
  };

  return (
    <AuthLayout title="Verify OTP">
      <Stack spacing={2}>
        <Typography variant="body2">A one-time password was sent to {email}</Typography>
        <TextField label="OTP" fullWidth value={otp} onChange={(e) => setOtp(e.target.value)} />
        <Button variant="contained" size="large" onClick={verify}>Verify</Button>
      </Stack>
    </AuthLayout>
  );
}
