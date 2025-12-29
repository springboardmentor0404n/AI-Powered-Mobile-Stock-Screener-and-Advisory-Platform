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
import Background from '../components/Background';

export default function Landing() {
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      <Background />

      {/* --- GLASS NAVIGATION --- */}
      <Box sx={{ 
        position: 'sticky', top: 20, zIndex: 1000,
        display: 'flex', justifyContent: 'center', px: 2
      }}>
        <Box sx={{ 
          width: '100%', maxWidth: '800px',
          backdropFilter: 'blur(12px)',
          bgcolor: alpha('#fff', 0.7),
          border: '1px solid',
          borderColor: alpha('#e2e8f0', 0.8),
          borderRadius: 8, px: 3, py: 1.5,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}>
          <Typography fontWeight={900} letterSpacing={-1} variant="h6">STOCK.AI</Typography>
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/login" size="small" sx={{ color: '#64748b' }}>Login</Button>
            <Button component={RouterLink} to="/register" variant="contained" size="small" sx={{ borderRadius: 4, px: 3 }}>Get Started</Button>
          </Stack>
        </Box>
      </Box>

      <Container maxWidth="lg">
        {/* --- HERO SECTION --- */}
        <Box sx={{ pt: 12, pb: 10, textAlign: 'center' }}>
          <Typography 
            variant="h1" 
            sx={{ 
              fontWeight: 900, 
              fontSize: { xs: '3rem', md: '4.5rem' },
              letterSpacing: '-0.04em',
              mb: 2,
              color: '#0f172a'
            }}
          >
            Predict the market <br />
            <Box component="span" sx={{ 
              color: 'primary.main',
              background: 'linear-gradient(90deg, #4f46e5, #9333ea)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              with AI precision.
            </Box>
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 5, fontWeight: 400 }}>
            Upload your CSVs, chat with our financial LLM, and get institutional-grade stock signals in seconds.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="contained" size="large" sx={{ height: 56, px: 6, borderRadius: 3, fontWeight: 700 }}>Start Screening</Button>
            <Button variant="outlined" size="large" sx={{ height: 56, px: 6, borderRadius: 3, fontWeight: 700, borderWidth: 2 }}>Learn More</Button>
          </Stack>
        </Box>

        {/* --- BENTO GRID SECTION --- */}
        <Grid container spacing={3}>
          {/* Big Feature: AI Analysis */}
          <Grid item xs={12} md={8}>
            <BentoCard 
              title="Real-time AI Advisory" 
              subtitle="Our AI analyzes 10,000+ data points per ticker to give you a 'Buy/Hold/Sell' conviction score."
              icon={<AutoAwesomeIcon sx={{ color: '#fff' }} />}
              bg="#4f46e5"
              textColor="#fff"
            />
          </Grid>

          {/* Small Feature: Charts */}
          <Grid item xs={12} md={4}>
            <BentoCard 
              title="Market Insights" 
              subtitle="Interactive visualizations of price trends."
              icon={<InsightsIcon />}
              bg="#fff"
            />
          </Grid>

          {/* Small Feature: CSV */}
          <Grid item xs={12} md={4}>
            <BentoCard 
              title="Smart CSV Upload" 
              subtitle="Drag & drop your trade history for instant analysis."
              icon={<ReceiptLongIcon />}
              bg="#fff"
            />
          </Grid>

          {/* Big Feature: 24/7 Support */}
          <Grid item xs={12} md={8}>
            <BentoCard 
              title="Intelligent Assistant" 
              subtitle="Ask complex questions like 'Which IT stocks are undervalued relative to their 5-year average?' and get instant answers."
              icon={<SupportAgentIcon />}
              bg="#f1f5f9"
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

/* --- BENTO CARD COMPONENT --- */
function BentoCard({ title, subtitle, icon, bg, textColor = "#1e293b" }) {
  return (
    <Card sx={{ 
      p: 4, 
      height: '100%', 
      bgcolor: bg, 
      color: textColor,
      borderRadius: 6,
      border: '1px solid #e2e8f0',
      boxShadow: 'none',
      transition: 'transform 0.3s ease',
      '&:hover': { transform: 'scale(1.02)' }
    }}>
      <Box sx={{ 
        width: 48, height: 48, borderRadius: 2, 
        bgcolor: textColor === "#fff" ? alpha('#fff', 0.2) : alpha('#4f46e5', 0.1),
        display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 
      }}>
        {icon}
      </Box>
      <Typography variant="h5" fontWeight={800} mb={1}>{title}</Typography>
      <Typography variant="body1" sx={{ opacity: 0.8, lineHeight: 1.5 }}>{subtitle}</Typography>
    </Card>
  );
}