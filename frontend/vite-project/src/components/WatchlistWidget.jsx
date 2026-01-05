import React from 'react';
import { Box, Typography, Stack, IconButton, alpha } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { useWatchlistStore } from '../store/useWatchlistStore';

export default function WatchlistWidget() {
  const { watchlist, removeFromWatchlist } = useWatchlistStore();

  return (
    <Stack spacing={1.5}>
      {watchlist.map((stock) => {
        const isPositive = (stock.close || 0) >= (stock.open || 0);
        const trendColor = isPositive ? '#10b981' : '#ef4444';

        const trendData = [
          { p: stock.open || 0 },
          { p: stock.low || 0 },
          { p: stock.high || 0 },
          { p: stock.close || 0 }
        ];

        return (
          <Box key={stock.symbol} sx={cardStyle}>
            {/* Symbol & Logo Section */}
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '25%' }}>
              <Box sx={logoStyle}>{stock.symbol.substring(0, 2).toUpperCase()}</Box>
              <Box>
                <Typography fontWeight={900} fontSize="0.95rem" color="#0f172a">{stock.symbol}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase' }}>
                    {stock.period > 1 ? `${stock.period}Q TREND` : 'EQUITY'}
                </Typography>
              </Box>
            </Stack>

            {/* --- CLEAN SPARKLINE SECTION --- */}
            <Box sx={{ width: '30%', height: 45 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  {/* ✅ Explicitly hide axes to remove default horizontal baselines */}
                  <XAxis hide axisLine={false} tickLine={false} />
                  <YAxis hide axisLine={false} tickLine={false} />
                  
                  {/* ✅ Do NOT include <CartesianGrid /> here */}
                  
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: trendColor, strokeWidth: 1 }} />
                  <Line 
                    type="monotone" 
                    dataKey="p" 
                    stroke="none"
                    strokeWidth={2.5} 
                    dot={false} 
                    animationDuration={1000}
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            {/* Price & Change Section */}
            <Box sx={{ textAlign: 'right', width: '25%' }}>
              <Typography fontWeight={900} fontSize="1.1rem">
                ₹{Number(stock.close || 0).toLocaleString()}
              </Typography>
              <Box sx={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 0.5, 
                px: 1, 
                py: 0.25, 
                borderRadius: 1.5, 
                bgcolor: alpha(trendColor, 0.1) 
              }}>
                {isPositive ? <TrendingUpIcon sx={{ fontSize: 14, color: trendColor }} /> : <TrendingDownIcon sx={{ fontSize: 14, color: trendColor }} />}
                <Typography variant="caption" fontWeight={900} sx={{ color: trendColor }}>
                    {isPositive ? '+' : ''}{stock.changePercent || '0.00'}%
                </Typography>
              </Box>
            </Box>

            {/* Actions Section */}
            <Stack direction="row" spacing={0.5} sx={{ width: '15%', justifyContent: 'flex-end' }}>
              <IconButton size="small" sx={{ color: '#94a3b8' }}><NotificationsNoneIcon fontSize="small" /></IconButton>
              <IconButton 
                size="small" 
                onClick={() => removeFromWatchlist(stock.symbol)} 
                sx={{ color: alpha('#ef4444', 0.4), '&:hover': { color: '#ef4444' } }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{ 
        bgcolor: '#1e293b', color: '#fff', px: 1, py: 0.5, 
        borderRadius: 1.5, fontSize: '10px', fontWeight: 700,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)' 
      }}>
        ₹{payload[0].value.toLocaleString()}
      </Box>
    );
  }
  return null;
};

// Styles (Ensure these don't have borderBottom or borderTop lines)
const cardStyle = {
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'space-between',
  p: 2, 
  borderRadius: 4, 
  bgcolor: '#fff', 
  border: '1px solid #f1f5f9',
  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
  transition: '0.2s',
  '&:hover': { transform: 'translateX(5px)', borderColor: '#6366f1' }
};

const logoStyle = {
  width: 40, 
  height: 40, 
  borderRadius: 2.5, 
  bgcolor: '#f8fafc', 
  color: '#64748b', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  fontWeight: 900, 
  fontSize: '0.75rem',
  border: '1px solid #e2e8f0'
};