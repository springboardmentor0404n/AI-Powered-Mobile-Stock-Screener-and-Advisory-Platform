import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { Box, TextField, Button, Typography, Stack, InputAdornment, IconButton, Tooltip } from "@mui/material";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AuthLayout from "../components/AuthLayout";
import api from "../services/api";
import { saveToken } from "../utils/auth";
import { useToast } from '../components/ToastProvider';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const login = async () => {
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      saveToken(res.data.access_token);
      navigate("/dashboard");
    } catch (e) {
      const message = e.response?.data?.error || "Login failed";
      setError(message);
      toast?.showToast(message, 'error');
    }
  };

  return (
    <AuthLayout title="Welcome Back">
      <Stack spacing={2}>
        <TextField label="Email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Password"
          type={show ? 'text' : 'password'}
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={show ? 'Hide password' : 'Show password'}>
                  <IconButton edge="end" onClick={() => setShow((s) => !s)}>
                    {show ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            )
          }}
        />

        <Button variant="contained" size="large" onClick={login}>Sign in</Button>

        {error && <Typography color="error">{error}</Typography>}

        <Box sx={{ mt: 1, textAlign: "center" }}>
          <Typography variant="body2">Don't have an account? <Button variant="text" component={RouterLink} to="/register">Create one</Button></Typography>
        </Box>
      </Stack>
    </AuthLayout>
  );
}
