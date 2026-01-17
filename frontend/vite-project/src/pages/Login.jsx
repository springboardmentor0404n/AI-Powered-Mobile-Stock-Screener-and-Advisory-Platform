import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Stack, 
  InputAdornment, 
  IconButton, 
  Tooltip, 
  alpha 
} from "@mui/material";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';
import AuthLayout from "../components/AuthLayout";
import api from "../services/api";
import { saveToken } from "../utils/auth";
import { useToast } from '../components/ToastProvider';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const toast = useToast();

  const login = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      
      // 1. Save the JWT Token
      saveToken(res.data.access_token);

      // 2. ✅ NEW: Save user info to LocalStorage so AlertModal can find user.id
      // We wrap it in JSON.stringify because localStorage only stores strings
      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
      } else if (res.data.user_id) {
        // Fallback if your backend returns user_id directly instead of a user object
        localStorage.setItem("user", JSON.stringify({ 
          id: res.data.user_id, 
          email: email 
        }));
      }

      toast?.showToast("Welcome back!", "success");
      navigate("/dashboard");
    } catch (e) {
      const message = e.response?.data?.error || "Login failed";
      setError(message);
      toast?.showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome Back">
      <Stack spacing={3.5}>
        <Box textAlign="center">
          <Typography variant="body2" color="text.secondary" mb={1}>
            Sign in to manage your portfolio and alerts
          </Typography>
        </Box>

        <Stack spacing={2.5}>
          <TextField 
            label="Email Address" 
            placeholder="name@company.com"
            fullWidth 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            sx={fieldStyle}
          />
          
          <Box>
            <TextField
              label="Password"
              type={show ? 'text' : 'password'}
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={fieldStyle}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={show ? 'Hide password' : 'Show password'}>
                      <IconButton edge="end" onClick={() => setShow((s) => !s)}>
                        {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                )
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button 
                variant="text" 
                size="small" 
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
              >
                Forgot password?
              </Button>
            </Box>
          </Box>

          <Button 
            variant="contained" 
            size="large" 
            onClick={login}
            disabled={loading}
            endIcon={!loading && <LoginIcon />}
            sx={{ 
              py: 1.8, 
              borderRadius: 3, 
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '1rem',
              background: 'linear-gradient(45deg, #4f46e5 30%, #6366f1 90%)',
              boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)',
              '&:hover': {
                boxShadow: '0 12px 24px rgba(79, 70, 229, 0.4)',
              }
            }}
          >
            {loading ? "Verifying..." : "Sign into Dashboard"}
          </Button>
        </Stack>

        {error && (
          <Box 
            sx={{ 
              bgcolor: alpha('#ef4444', 0.05), 
              p: 2, 
              borderRadius: 3, 
              border: '1px solid',
              borderColor: alpha('#ef4444', 0.2),
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <Typography color="error" variant="caption" sx={{ fontWeight: 600 }}>
              {error}
            </Typography>
          </Box>
        )}

        <Box sx={{ textAlign: "center", pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            New to the platform? 
            <Button 
              variant="text" 
              component={RouterLink} 
              to="/register" 
              sx={{ fontWeight: 800, textTransform: 'none', ml: 0.5, color: 'primary.main' }}
            >
              Create an account
            </Button>
          </Typography>
        </Box>
      </Stack>
    </AuthLayout>
  );
}

const fieldStyle = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 3,
    backgroundColor: alpha('#fff', 0.8),
    transition: '0.2s',
    '&:hover': {
      backgroundColor: '#fff',
    },
    '&.Mui-focused': {
      backgroundColor: '#fff',
      '& .MuiOutlinedInput-notchedOutline': {
        borderWidth: '2px',
      }
    }
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
    fontSize: '0.9rem'
  }
};