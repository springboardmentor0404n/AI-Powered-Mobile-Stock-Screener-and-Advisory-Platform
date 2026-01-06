import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Container, Typography, Grid, Paper, Card, CardContent,
  Stack, alpha, Button, Divider, Skeleton, Chip, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Tooltip as MuiTooltip, Tabs, Tab, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment
} from "@mui/material";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, BarChart, Bar
} from 'recharts';
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HistoryIcon from "@mui/icons-material/History";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TimelineIcon from "@mui/icons-material/Timeline";
import BarChartIcon from "@mui/icons-material/BarChart";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import InsightsIcon from "@mui/icons-material/Insights";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import api from "../services/api";

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`stock-tabpanel-${index}`}
      aria-labelledby={`stock-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Quarter calculation helper
const getQuarterInfo = (quartersBack = 0) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let targetQuarter = Math.floor(currentMonth / 3) - quartersBack;
  let targetYear = currentYear;

  while (targetQuarter < 0) {
    targetQuarter += 4;
    targetYear -= 1;
  }

  const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
  const startMonths = [0, 3, 6, 9];
  const endMonths = [2, 5, 8, 11];

  return {
    quarter: quarterNames[targetQuarter],
    year: targetYear,
    displayName: `${targetYear} ${quarterNames[targetQuarter]}`,
    startDate: new Date(targetYear, startMonths[targetQuarter], 1),
    endDate: new Date(targetYear, endMonths[targetQuarter] + 1, 0)
  };
};

// Calculate quarter performance
const calculateQuarterPerformance = (data, quarterInfo) => {
  if (!data?.api_trend?.length) return null;
  
  const filteredData = data.api_trend.filter(item => {
    const date = new Date(item.time);
    return date >= quarterInfo.startDate && date <= quarterInfo.endDate;
  });

  if (filteredData.length === 0) return null;

  const startPrice = filteredData[0].close;
  const endPrice = filteredData[filteredData.length - 1].close;
  const high = Math.max(...filteredData.map(d => d.close));
  const low = Math.min(...filteredData.map(d => d.close));
  const change = endPrice - startPrice;
  const percentChange = (change / startPrice) * 100;

  return {
    startPrice,
    endPrice,
    high,
    low,
    change,
    percentChange,
    days: filteredData.length,
    data: filteredData,
    isPositive: change >= 0
  };
};

export default function StockDetailPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [chartType, setChartType] = useState("area");
  const [selectedQuarter, setSelectedQuarter] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/analytics/stock-analysis/${symbol.trim()}`);
        
        if (res.data && res.data.status === "Success") {
          setData(res.data);
          setError(null);
        } else {
          setError("No hybrid data found for this symbol.");
        }
      } catch (err) {
        console.error("Analysis fetch failed", err);
        if (err.response?.status === 401) {
          navigate("/login");
        }
        setError("Failed to connect to backend analytics.");
      } finally {
        setLoading(false);
      }
    };

    if (symbol) fetchAnalysis();
  }, [symbol, navigate]);

  const quarterInfo = useMemo(() => getQuarterInfo(selectedQuarter), [selectedQuarter]);
  const quarterPerformance = useMemo(() => 
    calculateQuarterPerformance(data, quarterInfo), 
    [data, quarterInfo]
  );

  if (loading) return (
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Stack alignItems="center" spacing={3}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h5" fontWeight={600}>Loading Stock Screener...</Typography>
        <Typography variant="body2" color="text.secondary">Fetching comprehensive analysis for {symbol}</Typography>
      </Stack>
    </Box>
  );

  if (error) return (
    <Container sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Typography color="error" variant="h4" fontWeight={700} gutterBottom>{error}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, textAlign: 'center' }}>
        Unable to retrieve data for {symbol}. Please check the symbol or try again later.
      </Typography>
      <Button 
        variant="contained" 
        onClick={() => navigate("/dashboard")}
        sx={{ px: 4, py: 1.5, fontSize: '1rem', fontWeight: 700 }}
      >
        Return to Dashboard
      </Button>
    </Container>
  );

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Calculate overall metrics
  const calculateMetrics = () => {
    if (!data?.api_trend?.length) return {};
    
    const apiData = data.api_trend;
    const latestPrice = apiData[apiData.length - 1]?.close || 0;
    const oldestPrice = apiData[0]?.close || 0;
    const totalChange = latestPrice - oldestPrice;
    const percentChange = oldestPrice ? (totalChange / oldestPrice) * 100 : 0;
    
    const apiPrices = apiData.map(d => d.close);
    const apiHigh = Math.max(...apiPrices);
    const apiLow = Math.min(...apiPrices);
    
    return {
      latestPrice,
      totalChange,
      percentChange,
      apiHigh,
      apiLow,
      isPositive: totalChange >= 0
    };
  };

  const metrics = calculateMetrics();

  return (
    <Box sx={{ 
      backgroundColor: "#0f172a", 
      minHeight: "100vh",
    }}>
      {/* Screener Header - Upstox Style */}
      <Box sx={{ 
        bgcolor: '#1e293b', 
        borderBottom: '1px solid #334155',
        py: 2,
        px: { xs: 2, md: 4 }
      }}>
        <Container maxWidth={false} sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          px: { xs: 0, md: 2 }
        }}>
          <Stack direction="row" alignItems="center" spacing={3}>
            <Button 
              startIcon={<ArrowBackIcon />} 
              onClick={() => navigate("/dashboard")}
              sx={{ 
                color: '#94a3b8',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              Back
            </Button>
            <Divider orientation="vertical" flexItem sx={{ height: 24, bgcolor: '#334155' }} />
            <Typography variant="h5" fontWeight={800} sx={{ color: '#f8fafc' }}>
              STOCK SCREENER
            </Typography>
          </Stack>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search stocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: '#334155',
                  borderRadius: 1,
                  color: '#f8fafc',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#475569'
                  }
                }
              }}
              sx={{ width: 250 }}
            />
            <IconButton sx={{ color: '#94a3b8' }}>
              <FilterListIcon />
            </IconButton>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth={false} sx={{ 
        pt: 3, 
        px: { xs: 2, md: 4 },
        maxWidth: '1920px'
      }}>
        {/* Main Stock Header */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="h1" fontWeight={900} sx={{ 
                  color: '#f8fafc',
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  letterSpacing: '-0.5px'
                }}>
                  {data.symbol}
                </Typography>
                <Chip 
                  label={data.status === "Success" ? "LIVE" : "HISTORICAL"} 
                  color={data.status === "Success" ? "success" : "warning"}
                  sx={{ 
                    fontWeight: 900,
                    height: 32,
                    fontSize: '0.875rem'
                  }}
                />
              </Stack>
              <Typography variant="h6" sx={{ color: '#94a3b8' }}>
                {data.name || "NSE/BSE"} • Hybrid Intelligence Analysis
              </Typography>
            </Stack>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ 
              p: 3, 
              borderRadius: 2,
              bgcolor: '#1e293b',
              border: '1px solid #334155'
            }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    CURRENT PRICE
                  </Typography>
                  <Typography variant="h3" fontWeight={900} sx={{ color: '#f8fafc' }}>
                    ₹{formatNumber(metrics.latestPrice)}
                  </Typography>
                </Box>
                <Chip
                  icon={metrics.isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
                  label={`${metrics.isPositive ? '+' : ''}${metrics.percentChange.toFixed(2)}%`}
                  color={metrics.isPositive ? "success" : "error"}
                  sx={{ 
                    fontWeight: 900, 
                    height: 40,
                    fontSize: '1rem',
                    '& .MuiChip-icon': { fontSize: 20 }
                  }}
                />
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Quick Stats Row */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={4} md={2.4}>
            <Paper sx={{ 
              p: 2, 
              borderRadius: 2,
              bgcolor: '#1e293b',
              border: '1px solid #334155',
              height: '100%'
            }}>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>HIGH</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#22c55e' }}>
                ₹{formatNumber(metrics.apiHigh)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <Paper sx={{ 
              p: 2, 
              borderRadius: 2,
              bgcolor: '#1e293b',
              border: '1px solid #334155',
              height: '100%'
            }}>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>LOW</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ef4444' }}>
                ₹{formatNumber(metrics.apiLow)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <Paper sx={{ 
              p: 2, 
              borderRadius: 2,
              bgcolor: '#1e293b',
              border: '1px solid #334155',
              height: '100%'
            }}>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>VOLATILITY</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#f8fafc' }}>
                {((metrics.apiHigh - metrics.apiLow) / metrics.latestPrice * 100).toFixed(2)}%
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <Paper sx={{ 
              p: 2, 
              borderRadius: 2,
              bgcolor: '#1e293b',
              border: '1px solid #334155',
              height: '100%'
            }}>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>QUARTER</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#f8fafc' }}>
                {quarterInfo.displayName}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <Paper sx={{ 
              p: 2, 
              borderRadius: 2,
              bgcolor: '#1e293b',
              border: '1px solid #334155',
              height: '100%'
            }}>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>CSV RECORDS</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#f8fafc' }}>
                {data.csv_stats?.total_records?.toLocaleString() || '0'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Main Content Area - Enlarged Chart */}
        <Grid container spacing={3}>
          {/* Left: Enlarged Chart Area */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ 
              p: 3, 
              borderRadius: 3,
              bgcolor: '#1e293b',
              border: '1px solid #334155',
              minHeight: 650
            }}>
              {/* Chart Header with Quarter Selector */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h5" fontWeight={900} sx={{ color: '#f8fafc' }}>
                    Market Analysis - {quarterInfo.displayName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    {quarterPerformance?.days || 0} trading days • Candlestick Chart
                  </Typography>
                </Box>
                
                <Stack direction="row" spacing={2} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel sx={{ color: '#94a3b8' }}>Select Quarter</InputLabel>
                    <Select
                      value={selectedQuarter}
                      label="Select Quarter"
                      onChange={(e) => setSelectedQuarter(e.target.value)}
                      sx={{
                        color: '#f8fafc',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#475569'
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1'
                        }
                      }}
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(q => {
                        const qInfo = getQuarterInfo(q);
                        return (
                          <MenuItem key={q} value={q}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <CalendarTodayIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                              <span style={{ color: '#f8fafc' }}>{qInfo.displayName}</span>
                              {q === 0 && (
                                <Chip 
                                  label="Current" 
                                  size="small" 
                                  sx={{ 
                                    bgcolor: '#10b981',
                                    color: 'white',
                                    height: 20,
                                    fontSize: '0.7rem'
                                  }}
                                />
                              )}
                            </Stack>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  
                  <Stack direction="row" spacing={1}>
                    {['area', 'line', 'bar'].map((type) => (
                      <Button
                        key={type}
                        variant={chartType === type ? "contained" : "outlined"}
                        onClick={() => setChartType(type)}
                        sx={{ 
                          textTransform: 'capitalize',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          minWidth: 60,
                          bgcolor: chartType === type ? '#6366f1' : 'transparent',
                          color: chartType === type ? 'white' : '#94a3b8',
                          borderColor: '#475569',
                          '&:hover': {
                            borderColor: '#6366f1',
                            bgcolor: chartType === type ? '#4f46e5' : 'rgba(99, 102, 241, 0.1)'
                          }
                        }}
                      >
                        {type}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </Stack>
              
              {/* Quarter Performance Summary */}
              {quarterPerformance && (
                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                  <Paper sx={{ 
                    p: 2, 
                    borderRadius: 2,
                    flex: 1,
                    bgcolor: '#0f172a',
                    border: '1px solid #334155'
                  }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>QUARTER START</Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#f8fafc' }}>
                      ₹{formatNumber(quarterPerformance.startPrice)}
                    </Typography>
                  </Paper>
                  <Paper sx={{ 
                    p: 2, 
                    borderRadius: 2,
                    flex: 1,
                    bgcolor: '#0f172a',
                    border: '1px solid #334155'
                  }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>QUARTER END</Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ 
                      color: quarterPerformance.isPositive ? '#22c55e' : '#ef4444'
                    }}>
                      ₹{formatNumber(quarterPerformance.endPrice)}
                    </Typography>
                  </Paper>
                  <Paper sx={{ 
                    p: 2, 
                    borderRadius: 2,
                    flex: 1,
                    bgcolor: '#0f172a',
                    border: '1px solid #334155'
                  }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>QUARTER CHANGE</Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ 
                      color: quarterPerformance.isPositive ? '#22c55e' : '#ef4444'
                    }}>
                      {quarterPerformance.isPositive ? '+' : ''}{quarterPerformance.percentChange.toFixed(2)}%
                    </Typography>
                  </Paper>
                </Stack>
              )}
              
              {/* Main Chart */}
              <Box sx={{ height: 500, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "area" ? (
                    <AreaChart data={quarterPerformance?.data || data.api_trend}>
                      <defs>
                        <linearGradient id="darkGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={{ stroke: '#334155' }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                        }}
                      />
                      <YAxis 
                        domain={['auto', 'auto']} 
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={{ stroke: '#334155' }}
                        tickFormatter={(value) => `₹${formatNumber(value)}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: '1px solid #334155',
                          backgroundColor: '#1e293b',
                          color: '#f8fafc'
                        }}
                        formatter={(value) => [`₹${formatNumber(value)}`, 'Price']}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          return date.toLocaleDateString('en-IN', { 
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          });
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="close" 
                        stroke="#6366f1" 
                        strokeWidth={3} 
                        fill="url(#darkGradient)" 
                        animationDuration={2000}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  ) : chartType === "line" ? (
                    <LineChart data={quarterPerformance?.data || data.api_trend}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fill: '#94a3b8' }}
                        axisLine={{ stroke: '#334155' }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `₹${formatNumber(value)}`}
                        tick={{ fill: '#94a3b8' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          color: '#f8fafc'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="close" 
                        stroke="#6366f1" 
                        strokeWidth={3}
                        dot={{ stroke: '#6366f1', strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={quarterPerformance?.data || data.api_trend}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fill: '#94a3b8' }}
                        axisLine={{ stroke: '#334155' }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `₹${formatNumber(value)}`}
                        tick={{ fill: '#94a3b8' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          color: '#f8fafc'
                        }}
                      />
                      <Bar 
                        dataKey="close" 
                        fill="#6366f1" 
                        radius={[4, 4, 0, 0]}
                        animationDuration={1500}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </Box>
              
              {/* Timeframe Selector */}
              <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 3 }}>
                {['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'].map((period) => (
                  <Button
                    key={period}
                    variant="outlined"
                    size="small"
                    sx={{
                      color: '#94a3b8',
                      borderColor: '#334155',
                      borderRadius: 1,
                      minWidth: 50,
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: '#6366f1',
                        color: '#6366f1'
                      }
                    }}
                  >
                    {period}
                  </Button>
                ))}
              </Stack>
            </Paper>
          </Grid>

          {/* Right: Analysis Panels */}
          <Grid item xs={12} lg={4}>
            <Stack spacing={3}>
              {/* Historical Data Panel */}
              <Paper sx={{ 
                p: 3, 
                borderRadius: 3,
                bgcolor: '#1e293b',
                border: '1px solid #334155'
              }}>
                <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                  <Box sx={{ 
                    p: 1.5, 
                    borderRadius: 2,
                    bgcolor: 'rgba(99, 102, 241, 0.1)'
                  }}>
                    <HistoryIcon sx={{ color: '#6366f1', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={900} sx={{ color: '#f8fafc' }}>
                      Historical Intelligence
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      CSV Database Analysis
                    </Typography>
                  </Box>
                </Stack>
                
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>Average Price (All-Time)</Typography>
                    <Typography variant="h4" fontWeight={900} sx={{ color: '#f8fafc' }}>
                      ₹{formatNumber(data.csv_stats?.avg_price || 0)}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ borderColor: '#334155' }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>All-Time High</Typography>
                      <Typography variant="h5" fontWeight={700} sx={{ color: '#22c55e' }}>
                        ₹{formatNumber(data.csv_stats?.max_high || 0)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>All-Time Low</Typography>
                      <Typography variant="h5" fontWeight={700} sx={{ color: '#ef4444' }}>
                        ₹{formatNumber(data.csv_stats?.min_low || 0)}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 2,
                    bgcolor: '#0f172a',
                    border: '1px solid #334155'
                  }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>Total Records</Typography>
                      <Chip 
                        label={data.csv_stats?.total_records?.toLocaleString() || '0'} 
                        size="small"
                        sx={{ 
                          fontWeight: 700,
                          bgcolor: 'rgba(245, 158, 11, 0.1)',
                          color: '#f59e0b'
                        }}
                      />
                    </Stack>
                    <LinearProgress 
                      variant="determinate" 
                      value={75} 
                      sx={{ 
                        height: 6, 
                        borderRadius: 3, 
                        mt: 1,
                        bgcolor: 'rgba(245, 158, 11, 0.2)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#f59e0b',
                          borderRadius: 3
                        }
                      }} 
                    />
                    <Typography variant="caption" sx={{ color: '#64748b', mt: 1, display: 'block' }}>
                      Last Updated: {data.csv_stats?.last_csv_date || 'N/A'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* Performance Comparison */}
              <Paper sx={{ 
                p: 3, 
                borderRadius: 3,
                bgcolor: '#1e293b',
                border: '1px solid #334155'
              }}>
                <Typography variant="h6" fontWeight={900} sx={{ color: '#f8fafc', mb: 3 }}>
                  Performance Metrics
                </Typography>
                
                <Stack spacing={2}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" sx={{ color: '#94a3b8' }}>Current vs Historical Avg</Typography>
                      <Chip 
                        label={`${((metrics.latestPrice - data.csv_stats?.avg_price) / data.csv_stats?.avg_price * 100).toFixed(2)}%`}
                        color={metrics.latestPrice >= data.csv_stats?.avg_price ? "success" : "error"}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                      Difference: ₹{formatNumber(Math.abs(metrics.latestPrice - data.csv_stats?.avg_price))}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ borderColor: '#334155' }} />
                  
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" sx={{ color: '#94a3b8' }}>Current vs All-Time High</Typography>
                      <Chip 
                        label={`${((metrics.latestPrice - data.csv_stats?.max_high) / data.csv_stats?.max_high * 100).toFixed(2)}%`}
                        color={metrics.latestPrice >= data.csv_stats?.max_high ? "success" : "error"}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                      {metrics.latestPrice >= data.csv_stats?.max_high ? 'Above' : 'Below'} peak by ₹{formatNumber(Math.abs(metrics.latestPrice - data.csv_stats?.max_high))}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* Sector Information - Moved Down */}
              <Paper sx={{ 
                p: 3, 
                borderRadius: 3,
                bgcolor: '#1e293b',
                border: '1px solid #334155'
              }}>
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <InsightsIcon sx={{ color: '#8b5cf6' }} />
                  <Typography variant="h6" fontWeight={900} sx={{ color: '#f8fafc' }}>
                    Sector Analysis
                  </Typography>
                </Stack>
                
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>Industry</Typography>
                    <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                      {data.sector || 'Technology'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>Market Cap</Typography>
                    <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                      Large Cap
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>Volatility</Typography>
                    <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                      Medium
                    </Typography>
                  </Box>
                </Stack>
                
                <Divider sx={{ borderColor: '#334155', my: 2 }} />
                
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Sector performance and analysis based on historical trends and market data.
                </Typography>
              </Paper>
            </Stack>
          </Grid>
        </Grid>

        {/* Bottom: Data Table */}
        <Paper sx={{ 
          mt: 4, 
          borderRadius: 3,
          bgcolor: '#1e293b',
          border: '1px solid #334155',
          overflow: 'hidden'
        }}>
          <Box sx={{ p: 3, borderBottom: '1px solid #334155' }}>
            <Typography variant="h6" fontWeight={900} sx={{ color: '#f8fafc' }}>
              Recent Trading Data - {quarterInfo.displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Daily price movements for selected quarter
            </Typography>
          </Box>
          
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#0f172a' }}>
                  <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: '#334155' }}>Date</TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: '#334155' }}>Open</TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: '#334155' }}>High</TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: '#334155' }}>Low</TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: '#334155' }}>Close</TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: '#334155' }}>Change</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(quarterPerformance?.data || data.api_trend.slice(0, 20)).map((row, index) => {
                  const prevClose = index > 0 ? (quarterPerformance?.data || data.api_trend)[index - 1]?.close : row.close;
                  const change = row.close - prevClose;
                  const changePercent = (change / prevClose * 100).toFixed(2);
                  
                  return (
                    <TableRow 
                      key={index}
                      sx={{ 
                        '&:hover': { bgcolor: '#0f172a' },
                        '& td': { borderColor: '#334155' }
                      }}
                    >
                      <TableCell sx={{ color: '#94a3b8' }}>
                        {new Date(row.time).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell sx={{ color: '#f8fafc' }}>
                        ₹{formatNumber(row.open || row.close)}
                      </TableCell>
                      <TableCell sx={{ color: '#22c55e' }}>
                        ₹{formatNumber(row.high || row.close)}
                      </TableCell>
                      <TableCell sx={{ color: '#ef4444' }}>
                        ₹{formatNumber(row.low || row.close)}
                      </TableCell>
                      <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>
                        ₹{formatNumber(row.close)}
                      </TableCell>
                      <TableCell sx={{ color: change >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                        {change >= 0 ? '+' : ''}{change.toFixed(2)} ({change >= 0 ? '+' : ''}{changePercent}%)
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}