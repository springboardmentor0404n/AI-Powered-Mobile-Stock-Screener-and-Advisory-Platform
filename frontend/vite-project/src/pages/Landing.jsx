import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Container, Typography, Stack, Grid, 
  Card, alpha, useTheme, Fade, Zoom, useScrollTrigger, Fab
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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import BoltIcon from '@mui/icons-material/Bolt';
import SecurityIcon from '@mui/icons-material/Security';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import Background from '../components/Background';

export default function Landing() {
  const theme = useTheme();
  const [scrolled, setScrolled] = useState(false);
  
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const features = [
    { icon: <BoltIcon />, title: "Real-time Processing", desc: "Millisecond-level updates", color: "#f59e0b" },
    { icon: <SecurityIcon />, title: "Bank-level Security", desc: "256-bit encryption", color: "#10b981" },
    { icon: <IntegrationInstructionsIcon />, title: "Easy Integration", desc: "API & CSV support", color: "#6366f1" },
    { icon: <TrendingFlatIcon />, title: "Multi-platform", desc: "Web & Mobile ready", color: "#8b5cf6" },
  ];

  const testimonials = [
    { name: "Alex Chen", role: "Portfolio Manager", text: "Reduced research time by 70% while improving accuracy.", company: "QuantEdge Capital" },
    { name: "Sarah Miller", role: "Day Trader", text: "The AI predictions helped me spot trends I would have missed.", company: "Independent Trader" },
    { name: "David Park", role: "Financial Analyst", text: "Game-changing analytics for institutional investors.", company: "Goldman Sachs" },
  ];

  return (
    <Box sx={{ minHeight: '100vh', pb: 10, bgcolor: '#fdfdff', overflow: 'hidden' }}>
      <Background />
      
      {/* Animated gradient background elements */}
      <Box sx={{
        position: 'absolute',
        width: '800px',
        height: '800px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
        top: '-400px',
        right: '-200px',
        zIndex: 0,
      }} />
      
      {/* Scroll to top button */}
      <Zoom in={trigger}>
        <Fab
          onClick={scrollToTop}
          size="medium"
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            bgcolor: '#0f172a',
            color: 'white',
            '&:hover': { bgcolor: '#1e293b' }
          }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>

      {/* --- ENHANCED GLASS NAVIGATION --- */}
      <Fade in timeout={800}>
        <Box sx={{ 
          position: 'sticky', top: 20, zIndex: 1000,
          display: 'flex', justifyContent: 'center', px: 2,
          transition: 'all 0.3s ease',
          transform: scrolled ? 'translateY(-10px)' : 'translateY(0)',
        }}>
          <Box sx={{ 
            width: '100%', maxWidth: '1100px',
            backdropFilter: 'blur(20px)',
            bgcolor: alpha('#fff', scrolled ? 0.95 : 0.85),
            border: '1px solid',
            borderColor: alpha('#e2e8f0', scrolled ? 0.9 : 0.6),
            borderRadius: 12, px: 3, py: 1.5,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: scrolled 
              ? '0 20px 60px rgba(0,0,0,0.08)' 
              : '0 10px 30px rgba(0,0,0,0.04)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ 
                p: 0.8, borderRadius: 2, 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.05)' }
                }
              }}>
                <TrendingUpIcon sx={{ color: '#fff', fontSize: 22 }} />
              </Box>
              <Typography fontWeight={900} letterSpacing={-1.5} variant="h5" color="#0f172a">STOCK.AI</Typography>
            </Stack>
            
            <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {['Dashboard', 'Analytics', 'Market', 'Pricing'].map((text) => (
                <Button 
                  key={text}
                  component={RouterLink} to={`/${text.toLowerCase()}`}
                  sx={{ 
                    color: '#64748b', 
                    fontWeight: 700, 
                    textTransform: 'none', 
                    px: 2,
                    position: 'relative',
                    '&:after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: '2px',
                      background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      transition: 'width 0.3s ease'
                    },
                    '&:hover': {
                      color: '#0f172a',
                      '&:after': { width: '60%' }
                    }
                  }}
                >
                  {text}
                </Button>
              ))}
            </Stack>
            
            <Stack direction="row" spacing={1.5}>
              <Button 
                component={RouterLink} to="/login" 
                sx={{ 
                  color: '#0f172a', 
                  fontWeight: 700, 
                  textTransform: 'none',
                  borderRadius: 4,
                  px: 3,
                  border: '1px solid',
                  borderColor: alpha('#e2e8f0', 0.8),
                  '&:hover': {
                    borderColor: '#6366f1',
                    bgcolor: alpha('#6366f1', 0.04)
                  }
                }}
              >
                Login
              </Button>
              <Button 
                component={RouterLink} to="/register" 
                variant="contained" 
                sx={{ 
                  borderRadius: 4, 
                  px: 3, 
                  py: 1,
                  fontWeight: 800, 
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    transition: 'left 0.7s'
                  },
                  '&:hover': { 
                    boxShadow: '0 15px 40px rgba(99, 102, 241, 0.4)',
                    '&:before': { left: '100%' }
                  }
                }}
              >
                Get Started Free
              </Button>
            </Stack>
          </Box>
        </Box>
      </Fade>

      <Container maxWidth="lg">
        {/* --- ENHANCED HERO SECTION --- */}
        <Box sx={{ pt: 15, pb: 12, textAlign: 'center', position: 'relative' }}>
          <Fade in timeout={1000}>
            <Box>
              <Box sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                mb: 4,
                px: 3,
                py: 1,
                borderRadius: 20,
                bgcolor: alpha('#6366f1', 0.1),
                border: '1px solid',
                borderColor: alpha('#6366f1', 0.2)
              }}>
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#10b981',
                  animation: 'pulse 1.5s infinite'
                }} />
                <Typography variant="caption" fontWeight={700} color="#6366f1">
                  LIVE: NASDAQ +1.2% • S&P 500 +0.8%
                </Typography>
              </Box>
              
              <Typography 
                variant="h1" 
                sx={{ 
                  fontWeight: 900, 
                  fontSize: { xs: '3rem', md: '5.5rem' },
                  letterSpacing: '-0.06em',
                  lineHeight: 0.95,
                  mb: 3,
                  color: '#0f172a',
                  background: 'linear-gradient(to right, #0f172a, #334155)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                AI-Powered <br />
                <Box component="span" sx={{ 
                  background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  position: 'relative',
                  '&:after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-5px',
                    left: '10%',
                    width: '80%',
                    height: '3px',
                    background: 'linear-gradient(90deg, transparent, #6366f1, transparent)',
                    borderRadius: 2
                  }
                }}>
                  Market Intelligence
                </Box>
              </Typography>
              
              <Typography 
                variant="h6" 
                sx={{ 
                  maxWidth: 700, 
                  mx: 'auto', 
                  mb: 6, 
                  color: '#64748b', 
                  fontWeight: 500, 
                  fontSize: '1.3rem',
                  lineHeight: 1.6
                }}
              >
                Transform complex market data into <strong>actionable insights</strong> with real-time AI analysis, predictive analytics, and institutional-grade tools.
              </Typography>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center" alignItems="center">
                <Button 
                  component={RouterLink} 
                  to="/dashboard" 
                  variant="contained" 
                  size="large" 
                  endIcon={<ArrowForwardIcon />}
                  sx={{ 
                    height: 60, 
                    px: 6, 
                    borderRadius: 4, 
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)',
                    minWidth: 240,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 25px 50px rgba(99, 102, 241, 0.4)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Launch Dashboard
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<PlayCircleOutlineIcon />}
                  sx={{
                    height: 60,
                    px: 4,
                    borderRadius: 4,
                    fontWeight: 700,
                    borderWidth: 2,
                    borderColor: '#e2e8f0',
                    color: '#0f172a',
                    '&:hover': {
                      borderColor: '#6366f1',
                      bgcolor: alpha('#6366f1', 0.04)
                    }
                  }}
                >
                  Watch Demo
                </Button>
              </Stack>
              
              {/* Stats Bar */}
              <Fade in timeout={1500}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 6,
                  mt: 8,
                  flexWrap: 'wrap'
                }}>
                  {[
                    { value: '10K+', label: 'Active Traders' },
                    { value: '99.8%', label: 'Uptime' },
                    { value: '50ms', label: 'Real-time Data' },
                    { value: '4.9★', label: 'User Rating' }
                  ].map((stat, idx) => (
                    <Box key={idx} textAlign="center">
                      <Typography variant="h3" fontWeight={900} color="#0f172a">
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" color="#64748b" fontWeight={600}>
                        {stat.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Fade>
            </Box>
          </Fade>
        </Box>

        {/* --- ENHANCED BENTO GRID LAYOUT --- */}
        <Typography variant="h2" fontWeight={900} textAlign="center" mb={1} color="#0f172a">
          Everything You Need
        </Typography>
        <Typography variant="h6" textAlign="center" mb={6} color="#64748b">
          Comprehensive tools for modern traders
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 12 }}>
          {/* Feature 1: Large Card */}
          <Grid item xs={12} md={8}>
            <FeatureCard 
              title="Live Market Intelligence"
              description="Advanced technical indicators, real-time order book analysis, and market sentiment tracking. Get institutional-grade analytics in a simple interface."
              icon={<InsightsIcon />}
              color="#6366f1"
              isLarge
              features={['Real-time alerts', 'Pattern recognition', 'Volume analysis', 'Market depth']}
            />
          </Grid>
          
          {/* Feature 2: Small Card */}
          <Grid item xs={12} md={4}>
            <FeatureCard 
              title="AI Trading Advisor"
              description="Ask complex questions and get data-backed answers instantly with our advanced NLP engine."
              icon={<SupportAgentIcon />}
              color="#ef4444"
              isInteractive
            />
          </Grid>

          {/* Feature 3: Small Card */}
          <Grid item xs={12} md={4}>
            <FeatureCard 
              title="Portfolio Sync"
              description="Seamless CSV uploads, broker integration, and historical performance analysis."
              icon={<ReceiptLongIcon />}
              color="#10b981"
              isInteractive
            />
          </Grid>

          {/* Feature 4: Small Card */}
          <Grid item xs={12} md={4}>
            <FeatureCard 
              title="Sector Heatmaps"
              description="Visual dominance tracking and trend analysis across all market sectors."
              icon={<TimelineIcon />}
              color="#f59e0b"
              isInteractive
            />
          </Grid>

          {/* Feature 5: Small Card */}
          <Grid item xs={12} md={4}>
            <FeatureCard 
              title="Predictive Analytics"
              description="ML forecasts for price trends with 85% historical accuracy."
              icon={<AutoAwesomeIcon />}
              color="#8b5cf6"
              isInteractive
            />
          </Grid>
        </Grid>

        {/* --- TESTIMONIALS SECTION --- */}
        <Box sx={{ mb: 12 }}>
          <Typography variant="h2" fontWeight={900} textAlign="center" mb={6} color="#0f172a">
            Trusted by Professionals
          </Typography>
          <Grid container spacing={4}>
            {testimonials.map((testimonial, idx) => (
              <Grid item xs={12} md={4} key={idx}>
                <Card sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: 4,
                  border: '1px solid #f1f5f9',
                  bgcolor: '#fff',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.08)'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box sx={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      bgcolor: alpha('#6366f1', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2
                    }}>
                      <Typography variant="h5" fontWeight={900} color="#6366f1">
                        {testimonial.name.charAt(0)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography fontWeight={900} color="#0f172a">
                        {testimonial.name}
                      </Typography>
                      <Typography variant="body2" color="#64748b">
                        {testimonial.role} • {testimonial.company}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography sx={{ color: '#475569', fontStyle: 'italic', lineHeight: 1.6 }}>
                    "{testimonial.text}"
                  </Typography>
                  <Box sx={{ display: 'flex', mt: 3 }}>
                    {[1,2,3,4,5].map((star) => (
                      <Box key={star} sx={{ color: '#fbbf24', mr: 0.5 }}>
                        ★
                      </Box>
                    ))}
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* --- FEATURES BAR --- */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 4,
          mb: 12,
          p: 4,
          borderRadius: 6,
          bgcolor: '#f8fafc',
          border: '1px solid #e2e8f0'
        }}>
          {features.map((feature, idx) => (
            <Box key={idx} sx={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center',
              gap: 2 
            }}>
              <Box sx={{
                width: 50,
                height: 50,
                borderRadius: 3,
                bgcolor: alpha(feature.color, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {React.cloneElement(feature.icon, { sx: { color: feature.color, fontSize: 24 } })}
              </Box>
              <Box>
                <Typography fontWeight={900} color="#0f172a">
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="#64748b">
                  {feature.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* --- CTA SECTION --- */}
        <Box sx={{
          textAlign: 'center',
          p: 8,
          borderRadius: 6,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Box sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)'
          }} />
          
          <Typography variant="h2" fontWeight={900} mb={3}>
            Start Trading Smarter Today
          </Typography>
          <Typography variant="h6" sx={{ mb: 5, color: '#cbd5e1', maxWidth: 600, mx: 'auto' }}>
            Join thousands of traders who are already making data-driven decisions with AI.
          </Typography>
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              size="large"
              sx={{
                height: 60,
                px: 6,
                borderRadius: 4,
                fontWeight: 800,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 20px 40px rgba(99, 102, 241, 0.4)'
                }
              }}
            >
              Get Started Free
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              sx={{
                height: 60,
                px: 4,
                borderRadius: 4,
                fontWeight: 700,
                borderColor: '#475569',
                color: 'white',
                '&:hover': {
                  borderColor: '#6366f1',
                  bgcolor: alpha('#6366f1', 0.1)
                }
              }}
            >
              Schedule a Demo
            </Button>
          </Stack>
          
          <Typography variant="caption" sx={{ display: 'block', mt: 4, color: '#94a3b8' }}>
            No credit card required • 14-day free trial • Cancel anytime
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

/* --- ENHANCED FEATURE CARD COMPONENT --- */
function FeatureCard({ title, description, icon, color, isLarge = false, isInteractive = false, features = [] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Card 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{ 
        p: 4, 
        height: '100%', 
        bgcolor: '#fff',
        borderRadius: 6,
        border: '1px solid #f1f5f9',
        boxShadow: hovered 
          ? `0 30px 60px ${alpha(color, 0.08)}` 
          : '0 4px 20px rgba(0,0,0,0.02)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': { 
          transform: 'translateY(-8px)',
          borderColor: alpha(color, 0.3)
        }
      }}
    >
      {/* Background effect on hover */}
      {isInteractive && hovered && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.5)})`,
          animation: 'slideIn 0.3s ease-out',
          '@keyframes slideIn': {
            from: { transform: 'translateX(-100%)' },
            to: { transform: 'translateX(0)' }
          }
        }} />
      )}
      
      <Box>
        <Box sx={{ 
          width: 60, 
          height: 60, 
          borderRadius: 3, 
          bgcolor: alpha(color, 0.1),
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          mb: 3,
          transition: 'all 0.3s ease',
          transform: hovered ? 'scale(1.1) rotate(5deg)' : 'scale(1)'
        }}>
          {React.cloneElement(icon, { 
            sx: { 
              color: color, 
              fontSize: 28,
              transition: 'all 0.3s ease',
              transform: hovered ? 'scale(1.1)' : 'scale(1)'
            } 
          })}
        </Box>
        
        <Typography 
          variant={isLarge ? "h3" : "h5"} 
          fontWeight={900} 
          mb={2} 
          color="#0f172a" 
          sx={{ 
            letterSpacing: '-0.02em',
            transition: 'all 0.3s ease',
            transform: hovered ? 'translateX(5px)' : 'translateX(0)'
          }}
        >
          {title}
        </Typography>
        
        <Typography variant="body1" sx={{ color: '#64748b', lineHeight: 1.6, fontWeight: 500, mb: 3 }}>
          {description}
        </Typography>
        
        {features.length > 0 && (
          <Box sx={{ mt: 3 }}>
            {features.map((feature, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: color, mr: 1.5 }} />
                <Typography variant="body2" color="#475569">
                  {feature}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      
      {(isLarge || isInteractive) && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            variant="text" 
            endIcon={<ArrowForwardIcon sx={{ 
              transition: 'transform 0.3s ease',
              transform: hovered ? 'translateX(4px)' : 'translateX(0)'
            }} />} 
            sx={{ 
              color: color, 
              fontWeight: 800, 
              p: 0, 
              textTransform: 'none',
              '&:hover': { bgcolor: 'transparent' }
            }}
          >
            Explore {title.toLowerCase().includes('ai') ? 'AI' : 'feature'}
          </Button>
          
          {isInteractive && (
            <Typography variant="caption" sx={{ 
              color: '#64748b', 
              fontWeight: 600,
              bgcolor: alpha(color, 0.1),
              px: 2,
              py: 0.5,
              borderRadius: 2
            }}>
              Interactive
            </Typography>
          )}
        </Box>
      )}
    </Card>
  );
}