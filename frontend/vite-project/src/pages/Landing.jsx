import React from 'react';
import { 
  Box, Button, Container, Typography, Stack, Grid, 
  Card, alpha, useTheme 
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InsightsIcon from '@mui/icons-material/Insights';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TimelineIcon from '@mui/icons-material/Timeline';
import Background from '../components/Background';

export default function Landing() {
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: '100vh', pb: 10, bgcolor: '#f8fafc' }}>
      <Background />

      {/* --- GLASS NAVIGATION --- */}
      <Box sx={{ 
        position: 'sticky', top: 20, zIndex: 1000,
        display: 'flex', justifyContent: 'center', px: 2
      }}>
        <Box sx={{ 
          width: '100%', maxWidth: '1200px',
          backdropFilter: 'blur(12px)',
          bgcolor: alpha('#fff', 0.9),
          border: '1px solid',
          borderColor: alpha('#e2e8f0', 0.8),
          borderRadius: 8, px: 4, py: 1.5,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <TrendingUpIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography fontWeight={900} letterSpacing={-1} variant="h6" color="#0f172a">STOCK.AI</Typography>
          </Stack>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <Button 
              component={RouterLink} 
              to="/dashboard" 
              startIcon={<DashboardIcon />}
              sx={{ color: '#475569', fontWeight: 600 }}
            >
              Dashboard
            </Button>
            <Button 
              component={RouterLink} 
              to="/analytics" 
              startIcon={<AnalyticsIcon />}
              sx={{ color: '#475569', fontWeight: 600 }}
            >
              Analytics
            </Button>
            <Button 
              component={RouterLink} 
              to="/market" 
              startIcon={<TimelineIcon />}
              sx={{ color: '#475569', fontWeight: 600 }}
            >
              Market Trends
            </Button>
            <Box sx={{ ml: 2 }}>
              <Stack direction="row" spacing={1}>
                <Button 
                  component={RouterLink} 
                  to="/login" 
                  size="small" 
                  sx={{ color: '#64748b', fontWeight: 600 }}
                >
                  Login
                </Button>
                <Button 
                  component={RouterLink} 
                  to="/register" 
                  variant="contained" 
                  size="small" 
                  sx={{ 
                    borderRadius: 4, 
                    px: 3, 
                    fontWeight: 600,
                    background: 'linear-gradient(90deg, #4f46e5, #3b82f6)'
                  }}
                >
                  Get Started
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Box>

      <Container maxWidth="lg">
        {/* --- HERO SECTION --- */}
        <Box sx={{ pt: 15, pb: 12, textAlign: 'center' }}>
          <Typography 
            variant="h1" 
            sx={{ 
              fontWeight: 900, 
              fontSize: { xs: '3rem', md: '4.5rem' },
              letterSpacing: '-0.04em',
              mb: 3,
              color: '#0f172a'
            }}
          >
            Intelligent Stock Market <br />
            <Box component="span" sx={{ 
              background: 'linear-gradient(90deg, #4f46e5, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Analytics Platform
            </Box>
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ 
              maxWidth: 700, 
              mx: 'auto', 
              mb: 6, 
              fontWeight: 400,
              fontSize: '1.25rem'
            }}
          >
            Real-time stock analysis, AI-powered predictions, and comprehensive market insights. 
            Make data-driven investment decisions with institutional-grade tools.
          </Typography>
          <Stack direction="row" spacing={3} justifyContent="center">
            <Button 
              component={RouterLink}
              to="/dashboard"
              variant="contained" 
              size="large" 
              sx={{ 
                height: 56, 
                px: 6, 
                borderRadius: 3, 
                fontWeight: 700,
                fontSize: '1.1rem',
                background: 'linear-gradient(90deg, #4f46e5, #3b82f6)'
              }}
            >
              Launch Dashboard
            </Button>
            <Button 
              variant="outlined" 
              size="large" 
              sx={{ 
                height: 56, 
                px: 6, 
                borderRadius: 3, 
                fontWeight: 700, 
                borderWidth: 2,
                fontSize: '1.1rem'
              }}
            >
              View Demo
            </Button>
          </Stack>
        </Box>

        {/* --- FEATURES GRID --- */}
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 800, 
            textAlign: 'center', 
            mb: 6,
            color: '#0f172a'
          }}
        >
          Powerful Features for Smart Investing
        </Typography>

        <Grid container spacing={4}>
          {/* Feature 1: Live Analytics */}
          <Grid item xs={12} md={6}>
            <FeatureCard 
              title="Live Market Analytics"
              description="Real-time stock data with advanced technical indicators. Track price movements, volume trends, and market sentiment instantly."
              icon={<InsightsIcon />}
              color="#4f46e5"
            />
          </Grid>

          {/* Feature 2: AI Predictions */}
          <Grid item xs={12} md={6}>
            <FeatureCard 
              title="AI-Powered Predictions"
              description="Machine learning models analyze historical data to forecast price movements with high accuracy."
              icon={<AutoAwesomeIcon />}
              color="#3b82f6"
            />
          </Grid>

          {/* Feature 3: Portfolio Analysis */}
          <Grid item xs={12} md={6}>
            <FeatureCard 
              title="Portfolio Management"
              description="Upload your trade history via CSV and get personalized insights on your investment performance."
              icon={<ReceiptLongIcon />}
              color="#10b981"
            />
          </Grid>

          {/* Feature 4: Market Trends */}
          <Grid item xs={12} md={6}>
            <FeatureCard 
              title="Market Trend Analysis"
              description="Identify sector trends, volume spikes, and market patterns with interactive visualizations."
              icon={<TimelineIcon />}
              color="#f59e0b"
            />
          </Grid>

          {/* Feature 5: Quarter Analysis */}
          <Grid item xs={12} md={6}>
            <FeatureCard 
              title="Quarterly Performance"
              description="Detailed quarter-by-quarter analysis with growth metrics, volatility scores, and trend indicators."
              icon={<AnalyticsIcon />}
              color="#8b5cf6"
            />
          </Grid>

          {/* Feature 6: Smart Assistant */}
          <Grid item xs={12} md={6}>
            <FeatureCard 
              title="24/7 Trading Assistant"
              description="Ask complex financial questions and get instant answers backed by real-time market data."
              icon={<SupportAgentIcon />}
              color="#ef4444"
            />
          </Grid>
        </Grid>

        {/* --- CTA SECTION --- */}
        <Box sx={{ 
          mt: 12, 
          p: 6, 
          borderRadius: 6, 
          bgcolor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
          textAlign: 'center'
        }}>
          <Typography variant="h3" sx={{ fontWeight: 900, mb: 2, color: '#0f172a' }}>
            Ready to Transform Your Trading?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            Join thousands of investors who use our platform to make smarter decisions.
          </Typography>
          <Button 
            component={RouterLink}
            to="/register"
            variant="contained" 
            size="large" 
            sx={{ 
              height: 56, 
              px: 8, 
              borderRadius: 3, 
              fontWeight: 700,
              fontSize: '1.1rem',
              background: 'linear-gradient(90deg, #4f46e5, #3b82f6)'
            }}
          >
            Start Free Trial
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

/* --- FEATURE CARD COMPONENT --- */
function FeatureCard({ title, description, icon, color }) {
  return (
    <Card sx={{ 
      p: 4, 
      height: '100%', 
      bgcolor: '#ffffff',
      color: '#1e293b',
      borderRadius: 4,
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
      transition: 'all 0.3s ease',
      '&:hover': { 
        transform: 'translateY(-8px)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
      }
    }}>
      <Box sx={{ 
        width: 60, 
        height: 60, 
        borderRadius: 3, 
        bgcolor: alpha(color, 0.1),
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        mb: 3 
      }}>
        {React.cloneElement(icon, { sx: { color: color, fontSize: 30 } })}
      </Box>
      <Typography variant="h5" fontWeight={800} mb={2} sx={{ color: '#0f172a' }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ color: '#475569', lineHeight: 1.6 }}>
        {description}
      </Typography>
    </Card>
  );
}