import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  Alert,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const API = "http://localhost:5001";

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isLogin ? `${API}/login` : `${API}/signup`;
    const payload = isLogin
      ? { email, password }
      : { username, email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Authentication failed");
        return;
      }

      if (isLogin) {
        localStorage.setItem("token", data.token);
        navigate("/");
      } else {
        setIsLogin(true);
        setError("Signup successful. Please login.");
      }
    } catch {
      setError("Server unavailable. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const inputSx = {
    bgcolor: "#fff",
    borderRadius: 2,
    "& input": { color: "#000" },
    "& fieldset": { borderColor: "#ccc" },
  };

  const labelSx = {
    color: "#000",
    bgcolor: "#fff",
    px: 0.5,
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      justifyContent="center"
      alignItems="center"
      sx={{
        background:
          "radial-gradient(circle at top, #141b2d 0%, #0b0f1a 50%, #05060a 100%)",
      }}
    >
      <Paper
        elevation={12}
        sx={{
          width: 420,
          p: 4,
          borderRadius: 3,
          bgcolor: "#0f1428",
        }}
      >
        <Typography variant="h5" textAlign="center" mb={3} color="white">
          {isLogin ? "Login" : "Create Account"}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              margin="normal"
              InputLabelProps={{ shrink: true, sx: labelSx }}
              InputProps={{ sx: inputSx }}
            />
          )}

          <TextField
            fullWidth
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            margin="normal"
            InputLabelProps={{ shrink: true, sx: labelSx }}
            InputProps={{ sx: inputSx }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            margin="normal"
            autoComplete="off"
            InputLabelProps={{ shrink: true, sx: labelSx }}
            InputProps={{
              sx: inputSx,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={loading}
            sx={{ mt: 3, py: 1.2, fontWeight: 600 }}
          >
            {loading ? "Please wait..." : isLogin ? "Login" : "Signup"}
          </Button>
        </form>

        <Typography textAlign="center" mt={3} variant="body2" color="#b9c2ff">
          {isLogin ? "New user?" : "Already have an account?"}{" "}
          <Button
            size="small"
            onClick={() => setIsLogin(!isLogin)}
            sx={{ textTransform: "none" }}
          >
            {isLogin ? "Sign up" : "Login"}
          </Button>
        </Typography>
      </Paper>
    </Box>
  );
}
