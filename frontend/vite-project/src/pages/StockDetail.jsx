import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Box, Container, Typography, Stack, ToggleButton, ToggleButtonGroup, 
  IconButton, alpha, Grid, CircularProgress, Paper, Divider, Tooltip as MuiTooltip
} from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from "../services/api";

export default function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [quarters, setQuarters] = useState(4);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async (qCount) => {
    setLoading(true);
    try {
      // ✅ Passing 'quarters' in the body ensures the backend triggers the resample logic
      const res = await api.post("/chat", { 
          query: `${symbol} performance history`, 
          quarters: qCount,
          symbols: [symbol] // Using symbols array for detail targeting
      });
      setHistory(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) { 
      setHistory([]); 
    } finally { 
      setLoading(false); 
    }
  }, [symbol]);

  useEffect(() => { 
    if (symbol) fetchHistory(quarters); 
  }, [fetchHistory, quarters, symbol]);

  if (loading) return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: '#0f172a' }} thickness={2} />
    </Box>
  );

  const latest = history[history.length - 1] || {};
  const first = history[0] || {};
  const isPositive = (latest.close || 0) >= (first.close || 0);
  const statusColor = isPositive ? '#10b981' : '#ef4444'; 
  const changePercent = first.close ? ((latest.close - first.close) / first.close * 100).toFixed(2) : 0;

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", color: "#0f172a", pb: 10 }}>
      {/* --- SUB-NAV BAR --- */}
      <Box sx={{ borderBottom: '1px solid #e2e8f0', bgcolor: '#fff', py: 1.5 }}>
        <Container maxWidth="lg">
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={() => navigate(-1)} size="small" sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" fontWeight={800} sx={{ color: '#64748b', letterSpacing: 1 }}>
              MARKET TERMINAL / <span style={{ color: '#0f172a' }}>{symbol?.toUpperCase()}</span>
            </Typography>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pt: 6 }}>
        {/* --- INSTITUTIONAL HEADER --- */}
        <Grid container spacing={4} alignItems="center" mb={6}>
          <Grid item xs={12} md={7}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
              <Typography variant="h3" fontWeight={900} sx={{ color: '#0f172a', letterSpacing: '-2px' }}>
                {symbol?.toUpperCase()}
              </Typography>
              <Box sx={{ px: 1.5, py: 0.5, bgcolor: alpha(statusColor, 0.1), borderRadius: 2 }}>
                <Typography variant="caption" fontWeight={900} sx={{ color: statusColor }}>
                  NSE: ACTIVE
                </Typography>
              </Box>
            </Stack>
            
            <Stack direction="row" spacing={2} alignItems="baseline">
              <Typography variant="h2" fontWeight={900} sx={{ color: '#1e293b', letterSpacing: '-3px' }}>
                ₹{latest.close?.toLocaleString()}
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: statusColor }}>
                {isPositive ? '↑' : '↓'} {Math.abs(changePercent)}%
              </Typography>
            </Stack>
          </Grid>

          <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { md: 'flex-end' } }}>
            <ToggleButtonGroup
              value={quarters}
              exclusive
              onChange={(e, v) => v && setQuarters(v)}
              size="small"
              sx={{ 
                bgcolor: '#fff', p: 0.5, borderRadius: 3, border: '1px solid #e2e8f0',
                '& .MuiToggleButton-root': { 
                    border: 'none', px: 3, fontWeight: 800, borderRadius: '8px !important',
                    color: '#64748b', '&.Mui-selected': { bgcolor: '#0f172a', color: '#fff' } 
                } 
              }}
            >
              <ToggleButton value={2}>6M</ToggleButton>
              <ToggleButton value={4}>1Y</ToggleButton>
              <ToggleButton value={12}>3Y</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>

        {/* --- MAIN ANALYSIS CHART --- */}
        <Paper elevation={0} sx={{ p: {xs: 2, md: 4}, borderRadius: 8, border: '1px solid #e2e8f0', bgcolor: '#fff', mb: 6, boxShadow: '0 20px 50px rgba(0,0,0,0.04)' }}>
          <Stack direction="row" justifyContent="space-between" mb={4}>
            <Typography variant="h6" fontWeight={900}>Quarterly Growth Matrix</Typography>
            <MuiTooltip title="Price data aggregated by Quarter End (QE)">
              <InfoOutlinedIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
            </MuiTooltip>
          </Stack>
          
          <Box sx={{ height: 400, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={statusColor} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={statusColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                  dy={15}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11}} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontWeight: 900 }}
                  cursor={{ stroke: statusColor, strokeWidth: 2 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="close" 
                  stroke={statusColor} 
                  strokeWidth={4} 
                  fill="url(#chartGradient)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* --- QUANTITATIVE METRICS --- */}
        <Grid container spacing={3}>
          {[
            { label: 'High Valuation', key: 'high', icon: '📈' },
            { label: 'Floor Support', key: 'low', icon: '📉' },
            { label: 'Accumulation', key: 'volume', icon: '📊' },
            { label: 'Money Flow', key: 'turnover', icon: '💰' }
          ].map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.label}>
              <Paper variant="outlined" sx={{ 
                p: 3, borderRadius: 5, border: '1px solid #e2e8f0', bgcolor: '#fff',
                transition: '0.3s ease',
                '&:hover': { transform: 'translateY(-5px)', borderColor: statusColor }
              }}>
                <Typography variant="caption" fontWeight={900} color="#94a3b8" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  {stat.label}
                </Typography>
                <Typography variant="h5" fontWeight={900} sx={{ mt: 1, color: '#1e293b' }}>
                  {stat.key === 'volume' ? '' : '₹'}
                  {Math.max(...history.map(h => h[stat.key] || 0)).toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}