import { useEffect, useState, useCallback } from "react";
import {
  Box, Typography, Card, CardContent, Grid, Button, Stack, Skeleton,
  Container, alpha, Paper, Dialog, DialogTitle, DialogContent, Table,
  TableBody, TableCell, TableHead, TableRow, IconButton, Select,
  MenuItem, FormControl, InputLabel, Chip, LinearProgress, useTheme
} from "@mui/material";
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Brush, Area
} from 'recharts';
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { useNavigate } from "react-router-dom";

import MainHeader from "../components/MainHeader";
import api from "../services/api";
import TopStocksBar from "../components/charts/TopStocksBar";
import VolumePie from "../components/charts/VolumePie";
import PortfolioCard from "../components/PortfolioCard"; 
import { useWatchlistStore } from "../store/useWatchlistStore";

// Color palette constant
const COLORS = {
  primary: { main: "#6366f1", light: "#818cf8", dark: "#4f46e5", gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" },
  success: { main: "#10b981", light: "#34d399", dark: "#059669", gradient: "linear-gradient(135deg, #10b981 0%, #34d399 100%)" },
  danger: { main: "#ef4444", light: "#f87171", dark: "#dc2626", gradient: "linear-gradient(135deg, #ef4444 0%, #f87171 100%)" },
  warning: { main: "#f59e0b", light: "#fbbf24", dark: "#d97706", gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" },
  info: { main: "#3b82f6", light: "#60a5fa", dark: "#2563eb", gradient: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)" },
  purple: { main: "#8b5cf6", light: "#a78bfa", dark: "#7c3aed", gradient: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)" },
  pink: { main: "#ec4899", light: "#f472b6", dark: "#db2777", gradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)" },
  background: { light: "#fdfdff", card: "#ffffff", hover: "#f8fafc", dark: "#0f172a" }
};

// Custom Candlestick Component
const Candlestick = (props) => {
  const { x, y, width, height, isUp } = props;
  const lineWidth = Math.max(width * 0.6, 3);
  const highY = y - height * 0.5; 
  const lowY = y + height * 0.5;  
  const bodyTop = Math.min(y, y + height); 
  const bodyHeight = Math.max(Math.abs(height), 3); 
  
  return (
    <g>
      <line x1={x + width / 2} y1={highY} x2={x + width / 2} y2={lowY} stroke={isUp ? COLORS.success.dark : COLORS.danger.dark} strokeWidth={1.5} strokeLinecap="round" />
      <rect x={x + (width - lineWidth) / 2} y={bodyTop} width={lineWidth} height={bodyHeight} fill={isUp ? COLORS.success.gradient : COLORS.danger.gradient} stroke={isUp ? COLORS.success.dark : COLORS.danger.dark} strokeWidth={1} rx={2} />
    </g>
  );
};

export default function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { watchlist } = useWatchlistStore();

  const [stats, setStats] = useState(null);
  const [topStocks, setTopStocks] = useState([]);
  const [volumeData, setVolumeData] = useState([]);
  const [universeCount, setUniverseCount] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockDetailData, setStockDetailData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // NEW: Dynamic CSV Stock List
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [selectedLiveStock, setSelectedLiveStock] = useState("");
  const [liveTrendData, setLiveTrendData] = useState([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [chartType, setChartType] = useState("candlestick");
  
  const [liveStockInfo, setLiveStockInfo] = useState({
    symbol: "", name: "", currentPrice: 0, open: 0, high: 0, low: 0, 
    change: 0, changePercent: 0, volume: 0, source: "", lastUpdated: "", realTime: false
  });

  // 1. Fetch available symbols from your 46 CSVs
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const res = await api.get("/analytics/available-symbols");
        if (res.data?.symbols) {
          setAvailableSymbols(res.data.symbols);
          // Set default selection to first available stock
          if (res.data.symbols.length > 0 && !selectedLiveStock) {
            setSelectedLiveStock(res.data.symbols[0].symbol);
          }
        }
      } catch (err) { console.error("Error fetching symbols:", err); }
    };
    fetchSymbols();
  }, []);

  const processCandlestickData = (data) => {
    return data.map(item => ({
      ...item,
      time: item.date || item.time, // Standardize date key
      isUp: item.close >= item.open,
      color: item.close >= item.open ? COLORS.success.main : COLORS.danger.main,
      fill: item.close >= item.open ? COLORS.success.light : COLORS.danger.light
    }));
  };

  // 2. Fetch data for the selected CSV/Live stock
  const fetchLiveTrend = useCallback(async (stockSymbol = selectedLiveStock) => {
    if (!stockSymbol) return;
    setIsLoadingLive(true);
    try {
      // Using today-stock which has the robust CSV fallback for your 46 stocks
      const res = await api.get(`/analytics/today-stock/${stockSymbol}`);
      
      if (res.data?.history_data?.length > 0) {
        const history = res.data.history_data;
        const processedData = processCandlestickData(history);
        setLiveTrendData(processedData);
        
        const today = res.data.today_data;
        setLiveStockInfo({
          symbol: res.data.symbol,
          name: res.data.symbol, // Use symbol as name since CSVs don't always have full names
          currentPrice: today.current_price,
          open: today.open_price,
          high: today.day_high,
          low: today.day_low,
          change: today.change,
          changePercent: today.percent_change,
          volume: today.volume,
          source: res.data.data_source,
          realTime: res.data.data_source === "marketstack_api",
          lastUpdated: new Date(res.data.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    } catch (err) { console.error("Data Fetch Error:", err); } 
    finally { setIsLoadingLive(false); }
  }, [selectedLiveStock]);

  useEffect(() => {
    if (selectedLiveStock) fetchLiveTrend();
  }, [selectedLiveStock, fetchLiveTrend]);

  // 3. Fetch general dashboard stats
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [topStocksRes, volumeRes, statsRes] = await Promise.all([
          api.get("/analytics/top-stocks"),
          api.get("/analytics/volume"),
          api.get("/analytics/stats")
        ]);
        const topData = topStocksRes.data || [];
        setTopStocks(topData);
        setVolumeData(volumeRes.data || []);
        setUniverseCount(statsRes.data?.universe_count || 0);
        if (topData.length > 0) {
          const sorted = [...topData].sort((a, b) => Number(b.price) - Number(a.price));
          setStats({ total: topData.length, highestPrice: sorted[0], lowestPrice: sorted[sorted.length - 1] });
        }
      } catch (error) { console.error("Dashboard Data Error:", error); }
    };
    fetchDashboardData();
  }, []);

  const handleChartClick = (symbol) => navigate(`/stock/${symbol}`);

  const handleStockChange = (event) => setSelectedLiveStock(event.target.value);

  return (
    <Box sx={{ backgroundColor: COLORS.background.light, minHeight: "100vh", pb: 5, background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
      <MainHeader title="AI Stock Screener" />
      <Container maxWidth={false} sx={{ pt: 4, px: { xs: 2, md: 8, lg: 10, xl: 12 } }}>
        
        {/* Header Section */}
        <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-1.5px', color: COLORS.background.dark }}>
                Market Intelligence
              </Typography>
              <Chip 
                label={liveStockInfo.realTime ? "REAL-TIME" : "CSV DATA"} 
                size="small" 
                sx={{ fontWeight: 900, background: liveStockInfo.realTime ? COLORS.primary.gradient : COLORS.warning.gradient, color: "white", px: 1 }} 
              />
            </Stack>
            <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5, fontWeight: 500 }}>
              Analyzing {universeCount} available stock datasets
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => navigate("/upload")} startIcon={<CloudUploadIcon />} sx={{ borderRadius: 4, px: 4, py: 1.5, fontWeight: 900, background: COLORS.purple.gradient, textTransform: 'none' }}>
            Upload CSV Data
          </Button>
        </Box>

        {/* Status Bar */}
        <Grid container spacing={2} mb={5}>
          <Grid item xs={12} sm={6} md={2}><KpiCard title="Universe" value={universeCount} icon={<AutoGraphIcon />} color={COLORS.primary.main} gradient={COLORS.primary.gradient} /></Grid>
          <Grid item xs={12} sm={6} md={2}><KpiCard title="AI Signals" value="Optimal" icon={<AccountBalanceWalletIcon />} color={COLORS.pink.main} gradient={COLORS.pink.gradient} /></Grid>
          <Grid item xs={12} sm={6} md={4}><InsightItem title="Market High (CSV)" stock={stats?.highestPrice} icon={<TrendingUpIcon />} color={COLORS.success.main} gradient={COLORS.success.gradient} /></Grid>
          <Grid item xs={12} sm={6} md={4}><InsightItem title="Market Low (CSV)" stock={stats?.lowestPrice} icon={<TrendingDownIcon />} color={COLORS.danger.main} gradient={COLORS.danger.gradient} /></Grid>
        </Grid>

        {/* Visualization Grid */}
        <Grid container spacing={4} mb={6}>
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 4, borderRadius: 4, border: "1px solid #e2e8f0", minHeight: 650, background: COLORS.background.card, position: 'relative', '&:before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: COLORS.primary.gradient } }}>
              <Typography variant="h5" fontWeight={900} mb={4}>Price Leaders (Last Recorded)</Typography>
              <Box sx={{ height: 550 }}><TopStocksBar data={topStocks} onBarClick={handleChartClick} /></Box>
            </Paper>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Card sx={{ borderRadius: 4, border: "1px solid #e2e8f0", minHeight: 650, background: COLORS.background.card, position: 'relative', '&:before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: COLORS.info.gradient } }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={900} mb={4}>Volume Distribution</Typography>
                <Box sx={{ height: 500 }}><VolumePie data={volumeData} /></Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Dynamic CSV Stock Chart Section */}
        <Box sx={{ mb: 6 }}>
          <Paper sx={{ p: 4, borderRadius: 4, border: "1px solid #e2e8f0", background: COLORS.background.card, position: 'relative', '&:before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: COLORS.warning.gradient } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CandlestickChartIcon sx={{ color: COLORS.warning.main, fontSize: 32, background: alpha(COLORS.warning.main, 0.1), padding: 1, borderRadius: 2 }} />
                <Box>
                  <Typography variant="h5" fontWeight={900}>Trend Analysis Dashboard</Typography>
                  <Typography variant="caption" sx={{ color: COLORS.primary.main, fontWeight: 700, background: alpha(COLORS.primary.main, 0.1), px: 1, py: 0.5, borderRadius: 1 }}>
                    SOURCE: {liveStockInfo.source.replace('_', ' ').toUpperCase()}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2}>
                <Button size="small" variant={chartType === "candlestick" ? "contained" : "outlined"} onClick={() => setChartType(chartType === "candlestick" ? "line" : "candlestick")} startIcon={chartType === "candlestick" ? <ShowChartIcon /> : <CandlestickChartIcon />} sx={{ borderRadius: 3, fontWeight: 700 }}>
                  {chartType === "candlestick" ? "Line Chart" : "Candlestick"}
                </Button>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Select From 46 CSVs</InputLabel>
                  <Select value={selectedLiveStock} label="Select From 46 CSVs" onChange={handleStockChange}>
                    {availableSymbols.map((s) => (
                      <MenuItem key={s.symbol} value={s.symbol}>{s.symbol} {s.has_api ? '📡' : '📁'}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton onClick={() => fetchLiveTrend()} disabled={isLoadingLive} sx={{ bgcolor: alpha(COLORS.success.main, 0.1), color: COLORS.success.main }}><RefreshIcon /></IconButton>
              </Stack>
            </Stack>

            {/* Stock Detail Summary */}
            <Box sx={{ mb: 3, p: 3, background: alpha(COLORS.primary.main, 0.05), borderRadius: 3, border: `1px solid ${alpha(COLORS.primary.main, 0.1)}` }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Typography variant="h6" fontWeight={900}>{liveStockInfo.symbol}</Typography>
                  <Typography variant="caption" color="text.secondary">Last Record: {liveStockInfo.lastUpdated}</Typography>
                </Grid>
                <Grid item xs={6} md={2}><Typography variant="caption">Closing</Typography><Typography variant="h6" fontWeight={900}>₹{formatNumber(liveStockInfo.currentPrice)}</Typography></Grid>
                <Grid item xs={6} md={2}><Typography variant="caption">Change</Typography><Typography variant="h6" fontWeight={900} color={liveStockInfo.change >= 0 ? COLORS.success.main : COLORS.danger.main}>{liveStockInfo.changePercent.toFixed(2)}%</Typography></Grid>
                <Grid item xs={6} md={2}><Typography variant="caption">High</Typography><Typography variant="h6" fontWeight={900} color={COLORS.success.main}>₹{formatNumber(liveStockInfo.high)}</Typography></Grid>
                <Grid item xs={6} md={2}><Typography variant="caption">Low</Typography><Typography variant="h6" fontWeight={900} color={COLORS.danger.main}>₹{formatNumber(liveStockInfo.low)}</Typography></Grid>
              </Grid>
            </Box>

            {isLoadingLive && <LinearProgress sx={{ mb: 3, height: 6, borderRadius: 3 }} />}

            {/* Charts Area */}
            <Box sx={{ height: 500, width: '100%' }}>
              {liveTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={liveTrendData}>
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.info.main} stopOpacity={0.8}/><stop offset="95%" stopColor={COLORS.info.main} stopOpacity={0.1}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha('#000', 0.1)} />
                    <XAxis dataKey="time" tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                    <YAxis yAxisId="left" domain={['auto', 'auto']} tickFormatter={(v) => `₹${v.toLocaleString()}`} />
                    <YAxis yAxisId="right" orientation="right" hide />
                    <Tooltip />
                    <Bar yAxisId="right" dataKey="volume" fill="url(#volGrad)" radius={[2, 2, 0, 0]} />
                    {chartType === "candlestick" ? (
                      <>
                        {liveTrendData.map((entry, index) => (
                          <Candlestick key={index} x={index * (100 / liveTrendData.length) * 0.8} y={entry.close} width={10} height={entry.close - entry.open} isUp={entry.isUp} />
                        ))}
                      </>
                    ) : (
                      <Area yAxisId="left" type="monotone" dataKey="close" stroke={COLORS.primary.main} strokeWidth={3} fill={alpha(COLORS.primary.main, 0.1)} />
                    )}
                    <Brush dataKey="time" height={25} stroke={COLORS.primary.main} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <Typography align="center" sx={{ mt: 10 }}>Select a stock to view history</Typography>}
            </Box>
          </Paper>
        </Box>

        {/* Watchlist Section */}
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" fontWeight={900}>📈 Your Watchlist</Typography>
            <Button onClick={() => navigate('/watchlist-all')} sx={{ color: COLORS.primary.main, fontWeight: 900 }}>View All Assets →</Button>
          </Stack>
          <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 4 }}>
            {watchlist.length === 0 ? (
              <Box sx={{ p: 8, width: '100%', textAlign: 'center', border: `2px dashed ${alpha(COLORS.primary.main, 0.3)}`, borderRadius: 3 }}>
                <Typography variant="h6" color="text.secondary">No assets in watchlist</Typography>
              </Box>
            ) : (
              watchlist.map((s) => (
                <Box key={s.symbol} onClick={() => navigate(`/stock/${s.symbol}`)} sx={{ cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                  <PortfolioCard stock={s} />
                </Box>
              ))
            )}
          </Box>
        </Box>

        <Button variant="contained" onClick={() => navigate("/chat")} sx={fabStyle} startIcon={<ChatBubbleIcon />}>Ask AI Advisor</Button>
      </Container>
    </Box>
  );
}

// Sub-components helpers
function KpiCard({ title, value, color, gradient, icon }) {
  return (
    <Card sx={{ borderRadius: 3, height: '100%', border: `1px solid ${alpha(color, 0.2)}`, transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 15px 35px ${alpha(color, 0.2)}` } }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
          <Box sx={{ p: 1.5, borderRadius: 3, background: gradient, color: 'white', display: 'flex' }}>{icon}</Box>
          <Typography variant="caption" fontWeight={900} sx={{ textTransform: 'uppercase', color }}>{title}</Typography>
        </Stack>
        <Typography variant="h3" fontWeight={900} sx={{ color }}>{value !== null ? value : <Skeleton width="60px" />}</Typography>
      </CardContent>
    </Card>
  );
}

function InsightItem({ title, stock, icon, color, gradient }) {
  return (
    <Card sx={{ borderRadius: 3, height: '100%', border: `1px solid ${alpha(color, 0.2)}`, '&:hover': { transform: 'translateY(-4px)' } }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
        <Box sx={{ p: 2, borderRadius: 3, background: gradient, color: 'white', display: 'flex' }}>{icon}</Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="caption" fontWeight={900} sx={{ textTransform: 'uppercase', color: 'text.secondary' }}>{title}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="h5" fontWeight={900}>{stock ? stock.symbol : <Skeleton width="80px" />}</Typography>
            <Typography variant="h4" fontWeight={900} sx={{ color }}>{stock ? `₹${(stock.price || stock.close || 0).toLocaleString()}` : ""}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

const formatNumber = (num) => Number(num || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const fabStyle = {
  position: 'fixed', bottom: 40, right: 40, borderRadius: 4, px: 4, py: 2.5, fontWeight: 900,
  background: `linear-gradient(135deg, ${COLORS.pink.main} 0%, ${COLORS.purple.main} 100%)`, 
  boxShadow: '0 15px 35px rgba(236, 72, 153, 0.3)', zIndex: 1000
};