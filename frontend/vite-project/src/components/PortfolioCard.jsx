import React from 'react';
import { Card, CardContent, Stack, Box, Typography, alpha } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { useNavigate } from "react-router-dom";

export default function PortfolioCard({ stock }) {
  const navigate = useNavigate();

  // 1. Safe Number Conversions to avoid NaN
  const closePrice = Number(stock.price || stock.close || 0);
  const changePct = Number(stock.changePercent || 0);
  
  // 2. Determine Trend and Colors
  const isPositive = changePct >= 0;
  const trendColor = isPositive ? '#10b981' : '#ef4444';
  
  // 3. Dynamic Period Label
  const periodLabel = stock.period > 1 ? `Last ${stock.period} Quarters` : "Last 24 hrs";

  // 4. Data Mapping for Sparkline (Added a small variation for visual effect)
  const chartData = [
    { p: closePrice * 0.98 },
    { p: closePrice * 1.01 },
    { p: closePrice * 0.99 },
    { p: closePrice }
  ];

  return (
    <Card 
      onClick={() => navigate(`/stock/${stock.symbol.toUpperCase()}`)}
      sx={{ 
        minWidth: 280, 
        borderRadius: 6, 
        border: '1px solid #f1f5f9', 
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': { 
            transform: 'translateY(-8px)', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
            borderColor: '#6366f1'
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box sx={{ 
            p: 1.2, borderRadius: 3, bgcolor: alpha(trendColor, 0.1), 
            color: trendColor, display: 'flex'
          }}>
            {isPositive ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            {/* UPDATED: Added safety check to prevent NaN display */}
            <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1, color: '#0f172a' }}>
              ₹{closePrice > 0 ? closePrice.toLocaleString('en-IN') : "0.00"}
            </Typography>
            <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 1 }}>
              {stock.symbol}
            </Typography>
          </Box>
        </Stack>

        {/* --- CLEAN SPARKLINE (Trend Line Enabled) --- */}
        <Box sx={{ height: 50, mb: 2, mt: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
              <Line 
                type="Line" 
                dataKey="p" 
                stroke={trendColor} 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box sx={{ px: 1.2, py: 0.5, borderRadius: 1.5, bgcolor: alpha(trendColor, 0.1) }}>
              {/* UPDATED: Fixed to 2 decimal places to remove long strings */}
              <Typography variant="caption" fontWeight={900} sx={{ color: trendColor }}>
                {isPositive ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>
              {periodLabel}
            </Typography>
        </Stack>
        
        <Typography 
          variant="caption" 
          fontWeight={700} 
          sx={{ 
            display: 'block', mt: 1.5, textAlign: 'center', 
            color: alpha(trendColor, 0.8), textTransform: 'uppercase', fontSize: '0.65rem'
          }}
        >
          {isPositive ? "Bullish Accumulation" : "Bearish Distribution"}
        </Typography>
      </CardContent>
    </Card>
  );
}