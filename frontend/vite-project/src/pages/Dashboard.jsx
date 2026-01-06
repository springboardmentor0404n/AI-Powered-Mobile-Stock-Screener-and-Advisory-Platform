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
import { getTopStocks, getVolumeData } from "../services/analyticsApi";
import { useWatchlistStore } from "../store/useWatchlistStore";

const AVAILABLE_STOCKS = [
  { value: "RELIANCE", label: "Reliance Industries" },
  { value: "TCS", label: "TCS" },
  { value: "INFY", label: "Infosys" },
  { value: "HDFCBANK", label: "HDFC Bank" },
  { value: "ICICIBANK", label: "ICICI Bank" },
  { value: "SBIN", label: "SBI" },
  { value: "WIPRO", label: "Wipro" },
  { value: "AXISBANK", label: "Axis Bank" },
  { value: "ITC", label: "ITC Limited" },
  { value: "BHARTIARTL", label: "Bharti Airtel" }
];

// Color palette
const COLORS = {
  primary: {
    main: "#6366f1",    // Indigo
    light: "#818cf8",
    dark: "#4f46e5",
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
  },
  success: {
    main: "#10b981",    // Emerald
    light: "#34d399",
    dark: "#059669",
    gradient: "linear-gradient(135deg, #10b981 0%, #34d399 100%)"
  },
  danger: {
    main: "#ef4444",    // Red
    light: "#f87171",
    dark: "#dc2626",
    gradient: "linear-gradient(135deg, #ef4444 0%, #f87171 100%)"
  },
  warning: {
    main: "#f59e0b",    // Amber
    light: "#fbbf24",
    dark: "#d97706",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
  },
  info: {
    main: "#3b82f6",    // Blue
    light: "#60a5fa",
    dark: "#2563eb",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)"
  },
  purple: {
    main: "#8b5cf6",    // Violet
    light: "#a78bfa",
    dark: "#7c3aed",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)"
  },
  pink: {
    main: "#ec4899",    // Pink
    light: "#f472b6",
    dark: "#db2777",
    gradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)"
  },
  background: {
    light: "#fdfdff",
    card: "#ffffff",
    hover: "#f8fafc",
    dark: "#0f172a"
  }
};

const STOCK_NAMES = AVAILABLE_STOCKS.reduce((acc, stock) => {
  acc[stock.value] = stock.label;
  return acc;
}, {});

// Custom Candlestick Component
const Candlestick = (props) => {
  const { x, y, width, height, isUp } = props;
  const color = isUp ? COLORS.success.main : COLORS.danger.main;
  const lineWidth = Math.max(width * 0.6, 3);
  const highY = y - height * 0.5; 
  const lowY = y + height * 0.5;  
  const bodyTop = Math.min(y, y + height); 
  const bodyHeight = Math.max(Math.abs(height), 3); 
  
  return (
    <g>
      <line 
        x1={x + width / 2} y1={highY} 
        x2={x + width / 2} y2={lowY} 
        stroke={isUp ? COLORS.success.dark : COLORS.danger.dark}
        strokeWidth={1.5} strokeLinecap="round"
      />
      <rect 
        x={x + (width - lineWidth) / 2} y={bodyTop} 
        width={lineWidth} height={bodyHeight} 
        fill={isUp ? COLORS.success.gradient : COLORS.danger.gradient}
        stroke={isUp ? COLORS.success.dark : COLORS.danger.dark}
        strokeWidth={1} rx={2}
      />
    </g>
  );
};

export default function Dashboard() {
  const theme = useTheme();
  const [stats, setStats] = useState(null);
  const [topStocks, setTopStocks] = useState([]);
  const [volumeData, setVolumeData] = useState([]);
  const [universeCount, setUniverseCount] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockDetailData, setStockDetailData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [liveTrendData, setLiveTrendData] = useState([]);
  const [selectedLiveStock, setSelectedLiveStock] = useState("RELIANCE");
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [chartType, setChartType] = useState("candlestick");
  
  const [liveStockInfo, setLiveStockInfo] = useState({
    symbol: "RELIANCE", name: "Reliance Industries", 
    currentPrice: 0, open: 0, high: 0, low: 0, 
    change: 0, changePercent: 0, volume: 0, 
    source: "marketstack", lastUpdated: "", realTime: false
  });
  
  const navigate = useNavigate();
  const { watchlist } = useWatchlistStore();

  const processCandlestickData = (data) => {
    return data.map(item => ({
      ...item,
      isUp: item.close >= item.open,
      color: item.close >= item.open ? COLORS.success.main : COLORS.danger.main,
      fill: item.close >= item.open ? COLORS.success.light : COLORS.danger.light
    }));
  };

  const fetchLiveTrend = useCallback(async (stockSymbol = selectedLiveStock) => {
    setIsLoadingLive(true);
    try {
      const res = await api.get(`/analytics/live-trend/${stockSymbol}`);
      if (res.data?.data?.length > 0) {
        const marketData = res.data;
        const processedData = processCandlestickData(marketData.data);
        setLiveTrendData(processedData);
        
        const latest = marketData.data[marketData.data.length - 1];
        const openPrice = latest?.open || 0;
        const currentPrice = latest?.close || 0;
        const change = currentPrice - openPrice;
        const changePercent = openPrice ? (change / openPrice) * 100 : 0;

        setLiveStockInfo({
          symbol: marketData.symbol || stockSymbol,
          name: STOCK_NAMES[stockSymbol] || stockSymbol,
          currentPrice, open: openPrice,
          high: latest?.high || 0, low: latest?.low || 0,
          change, changePercent,
          volume: latest?.volume || 0,
          source: "marketstack", realTime: true,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    } catch (err) { console.error("Live Fetch Error:", err); } 
    finally { setIsLoadingLive(false); }
  }, [selectedLiveStock]);

  useEffect(() => { fetchLiveTrend(); }, [fetchLiveTrend]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [topStocksRes, volumeRes, statsRes] = await Promise.all([
          api.get("/analytics/top-stocks"),
          api.get("/analytics/volume"),
          api.get("/analytics/stats")
        ]);
        const topData = topStocksRes.data?.data || topStocksRes.data || [];
        setTopStocks(topData);
        setVolumeData(volumeRes.data?.data || volumeRes.data || []);
        setUniverseCount(statsRes.data?.universe_count || 0);
        if (topData.length > 0) {
          const sorted = [...topData].sort((a, b) => Number(b.price || b.close || 0) - Number(a.price || a.close || 0));
          setStats({ total: topData.length, highestPrice: sorted[0], lowestPrice: sorted[sorted.length - 1] });
        }
      } catch (error) { console.error("Dashboard Data Error:", error); }
    };
    fetchDashboardData();
  }, []);

  const handleChartClick = async (symbol) => {
    if (!symbol) return;
    try {
      const res = await api.get(`/analytics/stock-details/${symbol}`);
      setStockDetailData(res.data?.data || []);
      setSelectedStock(symbol);
      setIsModalOpen(true);
    } catch (err) { console.error("Error fetching stock details", err); }
  };

  const handleStockChange = (event) => {
    const newStock = event.target.value;
    setSelectedLiveStock(newStock);
    fetchLiveTrend(newStock);
  };

  return (
    <Box sx={{ 
      backgroundColor: COLORS.background.light, minHeight: "100vh", pb: 5,
      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"
    }}>
      <MainHeader title="AI Stock Screener" />
      <Container maxWidth={false} sx={{ pt: 4, px: { xs: 2, md: 8, lg: 10, xl: 12 } }}>
        
        {/* Header Section */}
        <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-1.5px', color: COLORS.background.dark }}>
                Market Intelligence
              </Typography>
              <Chip label="REAL-TIME" size="small" sx={{ fontWeight: 900, background: COLORS.primary.gradient, color: "white", px: 1, animation: 'pulse 2s infinite' }} />
            </Stack>
            <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5, fontWeight: 500 }}>
              AI-driven insights for data-backed decisions
            </Typography>
          </Box>
          <Button 
            variant="contained" onClick={() => navigate("/upload")} 
            startIcon={<CloudUploadIcon />} 
            sx={{ borderRadius: 4, px: 4, py: 1.5, fontWeight: 900, background: COLORS.purple.gradient, boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)', textTransform: 'none' }}
          >
            Upload CSV Data
          </Button>
        </Box>

        {/* Status Bar */}
        <Grid container spacing={2} mb={5}>
          <Grid item xs={12} sm={6} md={2}><KpiCard title="Universe" value={universeCount} icon={<AutoGraphIcon />} color={COLORS.primary.main} gradient={COLORS.primary.gradient} /></Grid>
          <Grid item xs={12} sm={6} md={2}><KpiCard title="AI Signals" value="Optimal" icon={<AccountBalanceWalletIcon />} color={COLORS.pink.main} gradient={COLORS.pink.gradient} /></Grid>
          <Grid item xs={12} sm={6} md={4}><InsightItem title="Global Market High" stock={stats?.highestPrice} icon={<TrendingUpIcon />} color={COLORS.success.main} gradient={COLORS.success.gradient} /></Grid>
          <Grid item xs={12} sm={6} md={4}><InsightItem title="Global Market Low" stock={stats?.lowestPrice} icon={<TrendingDownIcon />} color={COLORS.danger.main} gradient={COLORS.danger.gradient} /></Grid>
        </Grid>

        {/* Charts Grid */}
        <Grid container spacing={4} mb={6}>
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 4, borderRadius: 4, border: "1px solid #e2e8f0", minHeight: 650, background: COLORS.background.card, position: 'relative', '&:before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: COLORS.primary.gradient } }}>
              <Typography variant="h5" fontWeight={900} mb={4}>Price Leaders</Typography>
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

        {/* Main OHLC Chart Section */}
        <Box sx={{ mb: 6 }}>
          <Paper sx={{ p: 4, borderRadius: 4, border: "1px solid #e2e8f0", background: COLORS.background.card, position: 'relative', '&:before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: COLORS.warning.gradient } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CandlestickChartIcon sx={{ color: COLORS.warning.main, fontSize: 32, background: alpha(COLORS.warning.main, 0.1), padding: 1, borderRadius: 2 }} />
                <Box>
                  <Typography variant="h5" fontWeight={900}>Live Market Analysis</Typography>
                  <Typography variant="caption" sx={{ color: COLORS.primary.main, fontWeight: 700, background: alpha(COLORS.primary.main, 0.1), px: 1, py: 0.5, borderRadius: 1 }}>OHLC CANDLESTICK CHART</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2}>
                <Button size="small" variant={chartType === "candlestick" ? "contained" : "outlined"} onClick={() => setChartType(chartType === "candlestick" ? "line" : "candlestick")} startIcon={chartType === "candlestick" ? <ShowChartIcon /> : <CandlestickChartIcon />} sx={{ borderRadius: 3, fontWeight: 700 }}>
                  {chartType === "candlestick" ? "Line Chart" : "Candlestick"}
                </Button>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Select Stock</InputLabel>
                  <Select value={selectedLiveStock} label="Select Stock" onChange={handleStockChange}>
                    {AVAILABLE_STOCKS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button variant="contained" size="small" onClick={() => fetchLiveTrend()} startIcon={<RefreshIcon />} disabled={isLoadingLive} sx={{ borderRadius: 3, background: COLORS.success.gradient }}>Refresh</Button>
              </Stack>
            </Stack>

            {/* Stock Metric Cards */}
            <Box sx={{ mb: 3, p: 3, background: alpha(COLORS.primary.main, 0.05), borderRadius: 3, border: `1px solid ${alpha(COLORS.primary.main, 0.1)}` }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}><Typography variant="h6" fontWeight={900}>{liveStockInfo.name}</Typography><Chip label={liveStockInfo.symbol} size="small" sx={{ fontWeight: 900, background: alpha(COLORS.primary.main, 0.1) }} /></Grid>
                <Grid item xs={6} md={2}><Typography variant="caption">Current</Typography><Typography variant="h6" fontWeight={900}>₹{liveStockInfo.currentPrice.toFixed(2)}</Typography></Grid>
                <Grid item xs={6} md={2}><Typography variant="caption">Change</Typography><Typography variant="h6" fontWeight={900} color={liveStockInfo.change >= 0 ? COLORS.success.main : COLORS.danger.main}>{liveStockInfo.changePercent.toFixed(2)}%</Typography></Grid>
                <Grid item xs={6} md={2}><Typography variant="caption">High</Typography><Typography variant="h6" fontWeight={900} color={COLORS.success.main}>₹{liveStockInfo.high.toFixed(2)}</Typography></Grid>
                <Grid item xs={6} md={2}><Typography variant="caption">Low</Typography><Typography variant="h6" fontWeight={900} color={COLORS.danger.main}>₹{liveStockInfo.low.toFixed(2)}</Typography></Grid>
              </Grid>
            </Box>

            {isLoadingLive && <LinearProgress sx={{ mb: 3, height: 6, borderRadius: 3 }} />}

            {/* Recharts Container */}
            <Box sx={{ height: 450, width: '100%' }}>
              {liveTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={liveTrendData}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.info.main} stopOpacity={0.8}/><stop offset="95%" stopColor={COLORS.info.main} stopOpacity={0.1}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha('#000', 0.1)} />
                    <XAxis dataKey="time" tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                    <YAxis yAxisId="left" domain={['auto', 'auto']} tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip />
                    <Bar yAxisId="right" dataKey="volume" fill="url(#volumeGradient)" name="Volume" radius={[2, 2, 0, 0]} />
                    {chartType === "candlestick" ? (
                      <>
                        <ReferenceLine yAxisId="left" y={liveStockInfo.currentPrice} stroke={alpha(COLORS.primary.main, 0.3)} strokeDasharray="3 3" />
                        {liveTrendData.map((entry, index) => (
                          <Candlestick key={index} x={index * (100 / liveTrendData.length) * 0.8} y={entry.close} width={10} height={entry.close - entry.open} isUp={entry.isUp} />
                        ))}
                      </>
                    ) : (
                      <Area yAxisId="left" type="monotone" dataKey="close" stroke={COLORS.primary.main} strokeWidth={3} fillOpacity={0.3} />
                    )}
                    <Brush dataKey="time" height={25} stroke={COLORS.primary.main} fill={alpha(COLORS.primary.main, 0.1)} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <Typography align="center" sx={{ mt: 10 }}>No data available</Typography>}
            </Box>
          </Paper>
        </Box>

        {/* Watchlist Section - ✅ UPDATED TO BE CLICKABLE */}
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" fontWeight={900}>📈 Your Watchlist</Typography>
            <Button onClick={() => navigate('/watchlist-all')} sx={{ color: COLORS.primary.main, fontWeight: 900 }}>View All Assets →</Button>
          </Stack>
          <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 4 }}>
            {watchlist.length === 0 ? (
              <Box sx={{ p: 8, width: '100%', textAlign: 'center', border: `2px dashed ${alpha(COLORS.primary.main, 0.3)}`, borderRadius: 3, background: alpha(COLORS.primary.main, 0.05) }}>
                <Typography variant="h6" color="text.secondary">No assets in watchlist</Typography>
              </Box>
            ) : (
              watchlist.map((s) => (
                <Box 
                  key={s.symbol} 
                  onClick={() => navigate(`/stock/${s.symbol}`)} 
                  sx={{ cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-4px)' } }}
                >
                  <PortfolioCard stock={s} />
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* FAB & Modal */}
        <Button variant="contained" onClick={() => navigate("/chat")} sx={fabStyle} startIcon={<ChatBubbleIcon />}>🤖 Ask AI Advisor</Button>
        <StockDetailModal open={isModalOpen} onClose={() => setIsModalOpen(false)} symbol={selectedStock} data={stockDetailData} />
      </Container>
    </Box>
  );
}

// Sub-components: KpiCard, InsightItem, StockDetailModal (Keep exactly as in your provided code)
function KpiCard({ title, value, color, gradient, icon }) {
  return (
    <Card sx={{ borderRadius: 3, height: '100%', background: 'white', border: `1px solid ${alpha(color, 0.2)}`, transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 15px 35px ${alpha(color, 0.2)}` } }}>
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
    <Card sx={{ borderRadius: 3, height: '100%', background: 'white', border: `1px solid ${alpha(color, 0.2)}`, transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 15px 35px ${alpha(color, 0.2)}` } }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
        <Box sx={{ p: 2, borderRadius: 3, background: gradient, color: 'white', display: 'flex' }}>{icon}</Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="caption" fontWeight={900} sx={{ textTransform: 'uppercase', color: 'text.secondary' }}>{title}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="h5" fontWeight={900}>{stock ? stock.symbol : <Skeleton width="80px" />}</Typography>
            <Typography variant="h4" fontWeight={900} sx={{ color }}>{stock ? `₹${stock.close || stock.price}` : ""}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function StockDetailModal({ open, onClose, symbol, data }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 900, background: COLORS.primary.gradient, color: 'white' }}>
        📊 Dataset View: {symbol}
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: alpha(COLORS.primary.main, 0.05) }}>
            <TableRow>{['Date', 'Open', 'High', 'Low', 'Close', 'Volume'].map((h) => <TableCell key={h} sx={{ fontWeight: 900 }}>{h}</TableCell>)}</TableRow>
          </TableHead>
          <TableBody>
            {data.slice(0, 20).map((row, idx) => (
              <TableRow key={idx} hover sx={{ '&:nth-of-type(odd)': { bgcolor: alpha(COLORS.primary.main, 0.02) } }}>
                <TableCell>{row.date || row.time || "N/A"}</TableCell>
                <TableCell>₹{row.open?.toLocaleString()}</TableCell>
                <TableCell sx={{ color: COLORS.success.main }}>₹{row.high?.toLocaleString()}</TableCell>
                <TableCell sx={{ color: COLORS.danger.main }}>₹{row.low?.toLocaleString()}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>₹{row.close?.toLocaleString()}</TableCell>
                <TableCell>{row.volume?.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

const fabStyle = {
  position: 'fixed', bottom: 40, right: 40, borderRadius: 4, px: 4, py: 2.5, fontWeight: 900,
  background: `linear-gradient(135deg, ${COLORS.pink.main} 0%, ${COLORS.purple.main} 100%)`, 
  boxShadow: '0 15px 35px rgba(236, 72, 153, 0.3)', zIndex: 1000
};