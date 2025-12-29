import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { 
  Stack, 
  TextField, 
  Button, 
  Typography, 
  Box, 
  alpha, 
  InputAdornment 
} from "@mui/material";
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AuthLayout from "../components/AuthLayout";
import api from "../services/api";
import { useToast } from '../components/ToastProvider';

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const toast = useToast();

  const register = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/register", form);
      toast?.showToast("OTP sent to your email!", "success");
      navigate(`/verify-otp?email=${encodeURIComponent(form.email)}`);
    } catch (e) {
      const message = e.response?.data?.error || "Registration failed";
      setError(message);
      toast?.showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create Account">
      <Stack spacing={3}>
        <Box textAlign="center" mb={1}>
          <Typography variant="body2" color="text.secondary">
            Join 2,000+ traders using AI for market edge
          </Typography>
        </Box>

        <Stack spacing={2.5}>
          <TextField 
            label="Full Name" 
            placeholder="John Doe"
            fullWidth 
            value={form.username} 
            onChange={(e) => setForm({ ...form, username: e.target.value })} 
            sx={fieldStyle}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField 
            label="Email Address" 
            placeholder="john@example.com"
            fullWidth 
            value={form.email} 
            onChange={(e) => setForm({ ...form, email: e.target.value })} 
            sx={fieldStyle}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MailOutlineIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField 
            label="Password" 
            type="password" 
            placeholder="••••••••"
            fullWidth 
            value={form.password} 
            onChange={(e) => setForm({ ...form, password: e.target.value })} 
            sx={fieldStyle}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                </InputAdornment>
              ),
            }}
          />

          <Button 
            variant="contained" 
            size="large" 
            onClick={register}
            disabled={loading}
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
            {loading ? "Creating Account..." : "Create Free Account"}
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
              textAlign: 'center'
            }}
          >
            <Typography color="error" variant="caption" sx={{ fontWeight: 600 }}>
              {error}
            </Typography>
          </Box>
        )}

        <Box sx={{ textAlign: "center", pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account? 
            <Button 
              variant="text" 
              component={RouterLink} 
              to="/login" 
              sx={{ fontWeight: 800, textTransform: 'none', ml: 0.5, color: 'primary.main' }}
            >
              Sign In
            </Button>
          </Typography>
        </Box>
      </Stack>
    </AuthLayout>
  );
}

// Matching styling from Login.jsx
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