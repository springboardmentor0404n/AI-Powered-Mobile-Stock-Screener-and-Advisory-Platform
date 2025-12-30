import React from 'react';
import { 
  Box, Container, Typography, Grid, Button, Stack, Breadcrumbs, Link, alpha 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import MainHeader from '../components/MainHeader';
import PortfolioCard from '../components/PortfolioCard';
import { useWatchlistStore } from '../store/useWatchlistStore';

export default function WatchlistAll() {
  const navigate = useNavigate();
  const { watchlist } = useWatchlistStore();

  return (
    <Box sx={{ backgroundColor: "#f8fafc", minHeight: "100vh", pb: 10 }}>
      {/* Reusing your consistent header */}
      <MainHeader title="Portfolio Manager" />
      
      <Container maxWidth={false} sx={{ pt: 4, px: { xs: 2, md: 6 } }}>
        {/* --- PROFESSIONAL NAVIGATION --- */}
        <Box mb={4}>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
            <Link 
              underline="hover" 
              color="inherit" 
              onClick={() => navigate('/dashboard')}
              sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              Dashboard
            </Link>
            <Typography color="text.primary" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
              All Assets
            </Typography>
          </Breadcrumbs>
          
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h3" fontWeight={900} sx={{ color: '#0f172a', letterSpacing: '-1.5px' }}>
                Watchlist Portfolio
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                Monitoring {watchlist.length} tracked assets.
              </Typography>
            </Box>
            
            {/* ✅ REDIRECT BACK TO DASHBOARD BUTTON */}
            <Button 
              variant="outlined" 
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/dashboard')}
              sx={{ 
                borderRadius: 3, fontWeight: 800, textTransform: 'none', 
                borderWidth: 2, '&:hover': { borderWidth: 2 } 
              }}
            >
              Back to Dashboard
            </Button>
          </Stack>
        </Box>

        {/* --- HIGH-DENSITY GRID --- */}
        <Grid container spacing={3}>
          {watchlist.length === 0 ? (
            <Grid item xs={12}>
              <Box sx={{ 
                p: 10, textAlign: 'center', bgcolor: '#fff', 
                borderRadius: 8, border: '2px dashed #e2e8f0' 
              }}>
                <Typography variant="h6" color="text.secondary" fontWeight={700}>
                  No assets in your watchlist.
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={() => navigate('/chat')}
                  sx={{ mt: 3, borderRadius: 2, fontWeight: 800 }}
                >
                  Discover with AI
                </Button>
              </Box>
            </Grid>
          ) : (
            watchlist.map((stock) => (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={stock.symbol}>
                <PortfolioCard stock={stock} />
              </Grid>
            ))
          )}
        </Grid>
      </Container>
    </Box>
  );
}