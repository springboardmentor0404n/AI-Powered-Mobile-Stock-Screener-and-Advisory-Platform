import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Container, Typography, Grid, Paper, Card, CardContent,
  Stack, Button, Divider, Chip, Table, TableBody,
  TableCell, TableHead, TableRow, IconButton, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Alert, AlertTitle,
  ToggleButton, ToggleButtonGroup, LinearProgress
} from "@mui/material";
import {
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Bar, Area, Line, Scatter, ReferenceLine
} from 'recharts';
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TimelineIcon from '@mui/icons-material/Timeline';
import HistoryIcon from '@mui/icons-material/History';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import WarningIcon from '@mui/icons-material/Warning';
import CachedIcon from '@mui/icons-material/Cached';
import api from "../services/api";

// Custom colors for different data sources
const SOURCE_COLORS = {
  CSV: '#8b5cf6',  // Purple for historical CSV
  API: '#10b981',  // Green for live API
  MIXED: '#f59e0b' // Amber for mixed data
};

export default function StockDetailPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState('MIXED'); // CSV, API, or MIXED
  
  // Data states
  const [csvData, setCsvData] = useState([]); // 2021 and earlier data
  const [apiData, setApiData] = useState([]); // 2022-2026 MarketStack data
  const [combinedData, setCombinedData] = useState([]);
  const [marketStatus, setMarketStatus] = useState(null);
  
  // Year & Quarter State
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedQuarter, setSelectedQuarter] = useState(3); // Q4 by default (Oct-Dec)

  // Fetch CSV Historical Data (2021 and earlier)
  const fetchCsvData = useCallback(async () => {
    try {
      const res = await api.get(`/analytics/csv-history/${symbol.trim()}`);
      if (res.data?.data) {
        setCsvData(res.data.data.map(item => ({
          ...item,
          source: 'CSV',
          date: item.date,
          color: SOURCE_COLORS.CSV
        })));
      }
    } catch (err) {
      console.error("CSV fetch failed", err);
    }
  }, [symbol]);

  // Fetch Live MarketStack API Data (2022-2026)
  const fetchApiData = useCallback(async (year = null) => {
    try {
      setRefreshing(true);
      
      // If specific year requested, fetch that year's data
      if (year) {
        const res = await api.get(`/analytics/marketstack/${symbol.trim()}`, {
          params: { year: year }
        });
        
        if (res.data?.data) {
          setApiData(prev => {
            const newData = res.data.data.map(item => ({
              ...item,
              source: 'API',
              date: item.date,
              color: SOURCE_COLORS.API,
              isLive: year === 2026 // Mark 2026 data as live
            }));
            
            // Merge with existing API data, removing duplicates
            const existingDates = new Set(prev.map(d => d.date));
            const uniqueNewData = newData.filter(d => !existingDates.has(d.date));
            return [...prev, ...uniqueNewData];
          });
        }
      } else {
        // Fetch for all years 2022-2026
        const yearsToFetch = [2022, 2023, 2024, 2025, 2026];
        for (const year of yearsToFetch) {
          const res = await api.get(`/analytics/marketstack/${symbol.trim()}`, {
            params: { year: year }
          });
          
          if (res.data?.data) {
            setApiData(prev => {
              const newData = res.data.data.map(item => ({
                ...item,
                source: 'API',
                date: item.date,
                color: SOURCE_COLORS.API,
                isLive: year === 2026
              }));
              
              const existingDates = new Set(prev.map(d => d.date));
              const uniqueNewData = newData.filter(d => !existingDates.has(d.date));
              return [...prev, ...uniqueNewData];
            });
          }
          
          // Small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (err) {
      console.error("MarketStack API fetch failed", err);
    } finally {
      setRefreshing(false);
    }
  }, [symbol]);

  // Check market status
  const checkMarketStatus = useCallback(async () => {
    try {
      const res = await api.get('/analytics/market-status');
      setMarketStatus(res.data);
    } catch (err) {
      console.error("Market status check failed", err);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await fetchCsvData();
      await fetchApiData();
      await checkMarketStatus();
      setLoading(false);
    };
    initializeData();
  }, [fetchCsvData, fetchApiData, checkMarketStatus]);

  // Combine and filter data based on selected source
  useEffect(() => {
    let filteredData = [];
    
    if (dataSource === 'CSV') {
      filteredData = csvData;
    } else if (dataSource === 'API') {
      filteredData = apiData;
    } else { // MIXED
      filteredData = [...csvData, ...apiData];
    }
    
    // Filter by selected year
    filteredData = filteredData.filter(item => {
      const itemYear = new Date(item.date).getFullYear();
      return itemYear === selectedYear;
    });
    
    // Sort by date
    filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    setCombinedData(filteredData);
  }, [csvData, apiData, dataSource, selectedYear, selectedQuarter]);

  // Calculate quarter stats
  const quarterStats = useMemo(() => {
    if (!combinedData || combinedData.length === 0) return null;
    
    const quarterData = combinedData.filter(item => {
      const date = new Date(item.date);
      const month = date.getMonth() + 1; // 1-12
      
      switch(selectedQuarter) {
        case 0: return month >= 1 && month <= 3; // Q1
        case 1: return month >= 4 && month <= 6; // Q2
        case 2: return month >= 7 && month <= 9; // Q3
        case 3: return month >= 10 && month <= 12; // Q4
        default: return true;
      }
    });
    
    if (quarterData.length === 0) return null;
    
    const sorted = [...quarterData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const start = sorted[0].close;
    const end = sorted[sorted.length - 1].close;
    const change = end - start;
    const percentChange = ((change / start) * 100).toFixed(2);
    
    const highs = sorted.map(d => d.high || d.close);
    const lows = sorted.map(d => d.low || d.close);
    
    return {
      current: end,
      high: Math.max(...highs),
      low: Math.min(...lows),
      change,
      percentChange,
      isPositive: change >= 0,
      days: quarterData.length,
      avgVolume: Math.round(quarterData.reduce((sum, d) => sum + (d.volume || 0), 0) / quarterData.length),
      startDate: sorted[0].date,
      endDate: sorted[sorted.length - 1].date
    };
  }, [combinedData, selectedQuarter]);

  // Get quarter label
  const getQuarterLabel = () => {
    const quarters = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
    return quarters[selectedQuarter] || 'All Quarters';
  };

  // Render data source indicator
  const renderDataSourceIndicator = () => {
    const sources = combinedData.map(d => d.source);
    const hasCSV = sources.includes('CSV');
    const hasAPI = sources.includes('API');
    
    if (hasCSV && hasAPI) {
      return (
        <Chip 
          icon={<WarningIcon />}
          label="MIXED SOURCES"
          sx={{ 
            bgcolor: SOURCE_COLORS.MIXED + '20',
            color: SOURCE_COLORS.MIXED,
            fontWeight: 800,
            borderRadius: 2
          }}
        />
      );
    } else if (hasCSV) {
      return (
        <Chip 
          icon={<HistoryIcon />}
          label="HISTORICAL CSV"
          sx={{ 
            bgcolor: SOURCE_COLORS.CSV + '20',
            color: SOURCE_COLORS.CSV,
            fontWeight: 800,
            borderRadius: 2
          }}
        />
      );
    } else {
      return (
        <Chip 
          icon={<LiveTvIcon />}
          label="LIVE API"
          sx={{ 
            bgcolor: SOURCE_COLORS.API + '20',
            color: SOURCE_COLORS.API,
            fontWeight: 800,
            borderRadius: 2
          }}
        />
      );
    }
  };

  if (loading && !refreshing) return (
    <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#f1f5f9' }}>
      <CircularProgress size={60} sx={{ color: '#4f46e5' }} />
    </Box>
  );

  return (
    <Box sx={{ 
      bgcolor: "#f1f5f9", 
      minHeight: "100vh", 
      pb: 10,
      width: '100vw',
      overflowX: 'hidden'
    }}>
      
      {/* MARKET STATUS ALERT */}
      {marketStatus && (
        <Alert 
          severity={marketStatus.isOpen ? "success" : "warning"}
          sx={{ 
            borderRadius: 0,
            borderBottom: '1px solid #e2e8f0',
            bgcolor: marketStatus.isOpen ? '#10b98115' : '#f59e0b15'
          }}
        >
          <AlertTitle>
            {marketStatus.isOpen ? '🏛️ MARKET OPEN' : '🏛️ MARKET CLOSED'}
          </AlertTitle>
          {marketStatus.isOpen ? 
            `Live trading until ${marketStatus.closeTime}. Real-time data available for 2026.` :
            `Market closed. Next session starts at ${marketStatus.nextOpen}. Showing latest available data.`
          }
        </Alert>
      )}

      {/* 1. TERMINAL HEADER - KEPT SAME */}
      <Paper elevation={0} sx={{ 
        p: 3, 
        borderBottom: '1px solid #e2e8f0', 
        bgcolor: 'white', 
        position: 'sticky', 
        top: 0, 
        zIndex: 1000 
      }}>
        <Container maxWidth={false}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={3} alignItems="center">
              <Button 
                startIcon={<ArrowBackIcon />} 
                onClick={() => navigate("/dashboard")} 
                sx={{ fontWeight: 800, color: '#0f172a' }}
              >
                TERMINAL
              </Button>
              <Typography variant="h4" fontWeight={900}>{symbol?.toUpperCase()} / INR</Typography>
              {renderDataSourceIndicator()}
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              {/* Data Source Toggle */}
              <ToggleButtonGroup
                value={dataSource}
                exclusive
                onChange={(e, value) => value && setDataSource(value)}
                size="small"
              >
                <ToggleButton value="CSV" sx={{ fontWeight: 700 }}>
                  <HistoryIcon fontSize="small" /> CSV
                </ToggleButton>
                <ToggleButton value="API" sx={{ fontWeight: 700 }}>
                  <LiveTvIcon fontSize="small" /> API
                </ToggleButton>
                <ToggleButton value="MIXED" sx={{ fontWeight: 700 }}>
                  <CachedIcon fontSize="small" /> MIXED
                </ToggleButton>
              </ToggleButtonGroup>

              {/* Year Selector */}
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Select Year</InputLabel>
                <Select 
                  value={selectedYear} 
                  label="Select Year" 
                  onChange={(e) => setSelectedYear(e.target.value)}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  <MenuItem value={2026}>2026 (Live API)</MenuItem>
                  <MenuItem value={2025}>2025 (API History)</MenuItem>
                  <MenuItem value={2021}>2021 (CSV Database)</MenuItem>
                  <MenuItem value={2024}>2020 (CSV Database)</MenuItem>
                  <MenuItem value={2023}>2019 (CSV Database)</MenuItem>
                  <MenuItem value={2022}>2018 (CSV Database)</MenuItem>
                </Select>
              </FormControl>

              {/* Quarter Selector */}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Quarter</InputLabel>
                <Select 
                  value={selectedQuarter} 
                  label="Quarter" 
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  <MenuItem value={0}>Q1 (Jan-Mar)</MenuItem>
                  <MenuItem value={1}>Q2 (Apr-Jun)</MenuItem>
                  <MenuItem value={2}>Q3 (Jul-Sep)</MenuItem>
                  <MenuItem value={3}>Q4 (Oct-Dec)</MenuItem>
                </Select>
              </FormControl>
              
              <IconButton 
                onClick={() => {
                  if (selectedYear >= 2022) {
                    fetchApiData(selectedYear);
                  }
                }} 
                disabled={refreshing}
                sx={{ 
                  bgcolor: '#4f46e5',
                  color: 'white',
                  '&:hover': { bgcolor: '#4338ca' }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Container>
      </Paper>

      {/* ✅ STEP 1 — REMOVE CONTAINER WIDTH LIMIT */}
      <Box sx={{ mt: 3, px: { xs: 2, sm: 3, lg: 4 }, scrollMarginTop: '120px' }}>
        {/* ✅ STEP 1 — KEY FIX: Add direction="column" to force vertical stacking */}
        <Grid container spacing={3} direction="column">
          
          {/* ✅ STEP 1 — BIG FULL-WIDTH CHART DOMINATES THE PAGE */}
          <Grid item xs={12}>
            <Paper sx={{ 
              p: { xs: 2, md: 3, lg: 4 },
              borderRadius: 4, 
              border: '1px solid #e2e8f0', 
              bgcolor: 'white',
              position: 'relative',
              overflow: 'hidden',
              scrollMarginTop: '120px'
            }}>
              {/* Loading Overlay */}
              {refreshing && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  zIndex: 10,
                  bgcolor: 'rgba(255,255,255,0.9)'
                }}>
                  <LinearProgress sx={{ height: 4 }} />
                </Box>
              )}

              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" mb={4} gap={3}>
                <Box>
                  <Typography variant="h2" fontWeight={900} color="#0f172a">
                    {quarterStats ? `₹${quarterStats.current.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "₹---"}
                  </Typography>
                  {quarterStats && (
                    <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                      <Chip 
                        icon={quarterStats.isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
                        label={`${quarterStats.isPositive ? '+' : ''}${quarterStats.percentChange}%`}
                        color={quarterStats.isPositive ? "success" : "error"}
                        sx={{ fontWeight: 900, height: 35, fontSize: '1rem' }}
                      />
                      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                        {selectedYear} • {getQuarterLabel()} • {quarterStats.days} Trading Days
                      </Typography>
                    </Stack>
                  )}
                </Box>
                <Stack direction="row" spacing={{ xs: 3, md: 5 }}>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>PERIOD HIGH</Typography>
                    <Typography variant="h5" fontWeight={800} color="#059669">
                      ₹{quarterStats?.high?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>PERIOD LOW</Typography>
                    <Typography variant="h5" fontWeight={800} color="#dc2626">
                      ₹{quarterStats?.low?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
              
              {/* ✅ CHART WITH MAXIMUM HEIGHT (TRADINGVIEW STYLE) */}
              <Box sx={{ 
                height: {
                  xs: 420,
                  md: 700,
                  lg: 850   // 🔥 BIG SCREENER LIKE TRADINGVIEW
                },
                width: '100%',
                mx: { xs: -1, md: -2, lg: -3 },
                mt: 2
              }}>
                {combinedData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={combinedData}
                      margin={{ top: 20, right: 0, left: 0, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        vertical={false} 
                        strokeDasharray="3 3" 
                        stroke="#f1f5f9" 
                      />
                      
                      <XAxis 
                        dataKey="date" 
                        padding={{ left: 0, right: 0 }}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} 
                        tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', {day:'numeric', month:'short'})} 
                      />
                      
                      <YAxis 
                        domain={['auto', 'auto']} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} 
                        tickFormatter={(value) => `₹${value.toLocaleString()}`}
                      />
                      
                      <RechartsTooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: '1px solid #e2e8f0', 
                          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                          padding: '12px',
                          backgroundColor: 'white'
                        }}
                        formatter={(value, name, props) => {
                          const dataPoint = props.payload;
                          return [
                            `₹${Number(value).toFixed(2)}`,
                            `${name} (${dataPoint.source})`
                          ];
                        }}
                        labelFormatter={(label) => 
                          new Date(label).toLocaleDateString('en-US', { 
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        }
                      />
                      
                      {/* Volume Bars */}
                      <Bar 
                        yAxisId="right" 
                        dataKey="volume" 
                        fill="#e2e8f0" 
                        opacity={0.5} 
                        barSize={40} 
                        radius={[4, 4, 0, 0]} 
                      />
                      
                      {/* Area Chart */}
                      <Area 
                        type="monotone" 
                        dataKey="close" 
                        stroke="#4f46e5" 
                        strokeWidth={4} 
                        fill="url(#areaGradient)" 
                        animationDuration={2000} 
                      />
                      
                      {/* Scatter points colored by source */}
                      <Scatter 
                        dataKey="close" 
                        fill={(entry) => entry.color || SOURCE_COLORS.API}
                        stroke="white"
                        strokeWidth={2}
                        r={3}
                      />
                      
                      {/* Reference line for current price */}
                      {quarterStats && (
                        <ReferenceLine 
                          y={quarterStats.current} 
                          stroke="#ef4444" 
                          strokeDasharray="3 3" 
                          strokeWidth={1}
                          label={{
                            value: `Current: ₹${quarterStats.current.toFixed(2)}`,
                            position: 'right',
                            fill: '#ef4444',
                            fontSize: 12
                          }}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack 
                    alignItems="center" 
                    justifyContent="center" 
                    height="100%" 
                    bgcolor="#f8fafc" 
                    borderRadius={4} 
                    border="2px dashed #e2e8f0"
                  >
                    <Typography variant="h5" color="text.secondary" fontWeight={700}>
                      No Data Available
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {selectedYear <= 2021 ? 
                        "Select 2021 for CSV historical data" : 
                        "Click refresh to fetch API data"
                      }
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* ✅ STEP 2 — DATA SOURCE INFO — FULL WIDTH BELOW CHART */}
          <Grid item xs={12}>
            {/* ✅ STEP 5 — Optional: Make stats look secondary (like Zerodha) */}
            <Card elevation={0} sx={{
              maxWidth: 1200, // ✅ Optional: Limit width for better readability
              mx: 'auto',     // ✅ Optional: Center it
              borderRadius: 4,
              border: '1px solid #e2e8f0',
              bgcolor: '#f8fafc',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: '#4f46e5',
                boxShadow: '0 4px 20px rgba(79, 70, 229, 0.1)'
              }
            }}>
              <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                <Typography variant="h6" fontWeight={800} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimelineIcon color="primary" /> Data Sources & Statistics
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800}>
                      CSV RECORDS (≤ 2021)
                    </Typography>
                    <Typography variant="h4" fontWeight={900} color={SOURCE_COLORS.CSV}>
                      {csvData.length}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800}>
                      API RECORDS (≥ 2022)
                    </Typography>
                    <Typography variant="h4" fontWeight={900} color={SOURCE_COLORS.API}>
                      {apiData.length}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800}>
                      CURRENT YEAR
                    </Typography>
                    <Typography variant="h4" fontWeight={900} color="#4f46e5">
                      {selectedYear}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800}>
                      TRADING DAYS
                    </Typography>
                    <Typography variant="h4" fontWeight={900}>
                      {quarterStats?.days || 0}
                    </Typography>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 3 }} />
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                          📊 Current Selection:
                        </Typography>
                        <Typography variant="body1" fontWeight={700}>
                          {selectedYear} • {getQuarterLabel()} • {quarterStats?.days || 0} trading days
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                          🔄 Data Source:
                        </Typography>
                        <Typography variant="body1" fontWeight={700} color={
                          dataSource === 'CSV' ? SOURCE_COLORS.CSV :
                          dataSource === 'API' ? SOURCE_COLORS.API : SOURCE_COLORS.MIXED
                        }>
                          {dataSource === 'CSV' ? 'Historical CSV Database' :
                           dataSource === 'API' ? 'Live MarketStack API' : 'Mixed (CSV + API)'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    {quarterStats && (
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            📈 Quarter Performance:
                          </Typography>
                          <Typography variant="body1" fontWeight={700} color={quarterStats.isPositive ? '#059669' : '#dc2626'}>
                            {quarterStats.isPositive ? '+' : ''}{quarterStats.percentChange}% 
                            ({quarterStats.isPositive ? '+' : ''}₹{quarterStats.change.toFixed(2)})
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            📊 Price Range:
                          </Typography>
                          <Typography variant="body1" fontWeight={700}>
                            ₹{quarterStats.low.toFixed(2)} - ₹{quarterStats.high.toFixed(2)}
                          </Typography>
                        </Box>
                      </Stack>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* ✅ STEP 4 — DAILY PERFORMANCE LOG — FULL WIDTH BELOW STATS */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{
              maxWidth: 1200, // ✅ Optional: Same width as stats card for consistency
              mx: 'auto',     // ✅ Optional: Center it
              borderRadius: 4,
              border: '1px solid #e2e8f0',
              bgcolor: '#f8fafc',
              height: '100%',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: '#4f46e5',
                boxShadow: '0 4px 20px rgba(79, 70, 229, 0.1)'
              }
            }}>
              <Box sx={{ 
                p: { xs: 2, md: 3 },
                bgcolor: '#ffffff', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="h6" fontWeight={800}>Daily Performance Log</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip 
                    label={`${combinedData.length} records`}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                  {quarterStats && (
                    <Chip 
                      label={`Avg Vol: ${(quarterStats.avgVolume / 1000).toFixed(0)}K`}
                      size="small"
                      sx={{ fontWeight: 700, bgcolor: '#4f46e5', color: 'white' }}
                    />
                  )}
                </Stack>
              </Box>
              
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Close (₹)</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Source</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Change %</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Volume</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {combinedData.slice().reverse().map((row, i) => {
                      // Calculate daily change
                      const prevClose = i < combinedData.length - 1 ? 
                        combinedData[combinedData.length - 2 - i]?.close : row.close;
                      const dailyChange = ((row.close - prevClose) / prevClose * 100).toFixed(2);
                      const isPositive = row.close >= prevClose;
                      
                      return (
                        <TableRow 
                          key={i} 
                          hover 
                          sx={{ 
                            '&:hover': { bgcolor: '#f1f5f9' },
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>
                            {new Date(row.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell sx={{ color: '#0f172a', fontWeight: 800 }}>
                            ₹{row.close.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              size="small" 
                              label={row.source}
                              sx={{ 
                                bgcolor: row.color + '20',
                                color: row.color,
                                fontWeight: 700,
                                height: 22,
                                fontSize: '0.7rem'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              size="small"
                              label={`${isPositive ? '+' : ''}${dailyChange}%`}
                              sx={{ 
                                bgcolor: isPositive ? '#d1fae5' : '#fee2e2',
                                color: isPositive ? '#059669' : '#dc2626',
                                fontWeight: 700,
                                height: 22,
                                fontSize: '0.7rem'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b' }}>
                              {(row.volume / 1000).toFixed(0)}K
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {combinedData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No data available for the selected criteria
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
              
              {combinedData.length > 0 && (
                <Box sx={{ 
                  p: 2, 
                  bgcolor: '#ffffff', 
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Typography variant="caption" color="text.secondary">
                    Showing {Math.min(combinedData.length, 10)} of {combinedData.length} records
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Data updated: {new Date().toLocaleDateString()}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

        </Grid>
      </Box>
    </Box>
  );
}