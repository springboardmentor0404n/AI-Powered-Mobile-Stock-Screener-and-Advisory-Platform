import React from 'react';
import { Card, CardContent, Stack, Box, Typography, alpha } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useNavigate } from "react-router-dom";

export default function PortfolioCard({ stock }) {
  const navigate = useNavigate();

  // 1. Determine Trend and Colors
  const isPositive = stock.close > (stock.open || 0);
  const trendColor = isPositive ? '#10b981' : '#ef4444';
  
  // 2. Dynamic Period Label
  const periodLabel = stock.period > 1 ? `Last ${stock.period} Quarters` : "Last 24 hrs";

  // 3. Data Mapping for Sparkline
  const chartData = [
    { p: stock.open || 0 },
    { p: stock.low || 0 },
    { p: stock.high || 0 },
    { p: stock.close || 0 }
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
            <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1, color: '#0f172a' }}>
              ₹{Number(stock.close).toLocaleString()}
            </Typography>
            <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 1 }}>
              {stock.symbol}
            </Typography>
          </Box>
        </Stack>

        {/* --- CLEAN SPARKLINE (Lines Removed) --- */}
        <Box sx={{ height: 50, mb: 2, mt: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              {/* By NOT including <XAxis />, <YAxis />, or <CartesianGrid />, 
                  all horizontal and vertical lines are removed.
              */}
              
              <Line 
                type="monotone" 
                dataKey="p" 
                stroke="none" 
                strokeWidth={3} 
                dot={false} 
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box sx={{ px: 1.2, py: 0.5, borderRadius: 1.5, bgcolor: alpha(trendColor, 0.1) }}>
              <Typography variant="caption" fontWeight={900} sx={{ color: trendColor }}>
                {isPositive ? '▲' : '▼'} {stock.changePercent || '0.00'}%
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