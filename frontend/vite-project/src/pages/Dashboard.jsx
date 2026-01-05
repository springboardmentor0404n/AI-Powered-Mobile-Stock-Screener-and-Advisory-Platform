              import { useEffect, useState } from "react";
              import {
                Box,
                Typography,
                Card,
                CardContent,
                Grid,
                Button,
                Stack,
                Skeleton,
                Container,
                alpha,
                Paper,
                Dialog,
                DialogTitle,
                DialogContent,
                Table,
                TableBody,
                TableCell,
                TableHead,
                TableRow,
                IconButton
              } from "@mui/material";
              import { 
                LineChart, 
                Line, 
                XAxis, 
                YAxis, 
                CartesianGrid, 
                Tooltip, 
                ResponsiveContainer, 
                AreaChart, 
                Area 
              } from 'recharts';
              import CloudUploadIcon from "@mui/icons-material/CloudUpload";
              import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
              import TrendingUpIcon from "@mui/icons-material/TrendingUp";
              import TrendingDownIcon from "@mui/icons-material/TrendingDown";
              import AutoGraphIcon from "@mui/icons-material/AutoGraph";
              import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
              import CloseIcon from "@mui/icons-material/Close"; 
              import { useNavigate } from "react-router-dom";

              import MainHeader from "../components/MainHeader";
              import api from "../services/api";

              /* Charts & Components */
              import TopStocksBar from "../components/charts/TopStocksBar";
              import VolumePie from "../components/charts/VolumePie";
              import PortfolioCard from "../components/PortfolioCard"; 
              import { getTopStocks, getVolumeData } from "../services/analyticsApi";
              import { useWatchlistStore } from "../store/useWatchlistStore";

              export default function Dashboard() {
                const [stats, setStats] = useState(null);
                const [topStocks, setTopStocks] = useState([]);
                const [volumeData, setVolumeData] = useState([]);
                
                // ✅ NEW: State for the dynamic Universe count from folder files
                const [universeCount, setUniverseCount] = useState(null);
                
                const [selectedStock, setSelectedStock] = useState(null);
                const [stockDetailData, setStockDetailData] = useState([]);
                const [isModalOpen, setIsModalOpen] = useState(false);
                
                const navigate = useNavigate();
                const { watchlist } = useWatchlistStore();

                useEffect(() => {
                  // 1. Fetch High/Low prices via Chat API
                  api.post("/chat", { query: "all stocks" }).then((res) => {
                    const rows = res.data?.data || [];
                    if (!rows.length) return setStats({});

                    const sortedByPrice = [...rows].sort((a, b) => Number(b.close || 0) - Number(a.close || 0));
                    setStats({
                      total: rows.length,
                      highestPrice: sortedByPrice[0],
                      lowestPrice: sortedByPrice[sortedByPrice.length - 1],
                    });
                  });

                  // ✅ 2. NEW: Fetch dynamic Universe count from folder analytics
                  api.get("/analytics/stats").then((res) => {
                    setUniverseCount(res.data.universe_count);
                  });

                  getTopStocks().then((res) => setTopStocks(res.data || []));
                  getVolumeData().then((res) => setVolumeData(res.data || []));
                }, []);

                const handleChartClick = async (symbol) => {
                  if (!symbol) return;
                  try {
                    const res = await api.get(`/analytics/stock-details/${symbol}`);
                    setStockDetailData(res.data);
                    setSelectedStock(symbol);
                    setIsModalOpen(true);
                  } catch (err) {
                    console.error("Error fetching stock details", err);
                  }
                };
                const sectorTrendData = topStocks.map((stock, index) => ({
                index,
                symbol: stock.symbol || stock.name || "N/A",
                close: Number(
                  stock.close ??
                  stock.price ??
                  stock.ltp ??
                  stock.value ??
                  stock.last  ??
                  0
                )
              }));

                return (
                  <Box sx={{ backgroundColor: "#fdfdff", minHeight: "100vh", pb: 5 }}>
                    <MainHeader title="AI Stock Screener" />

                    <Container maxWidth={false} sx={{ pt: 4, px: { xs: 2, md: 8, lg:10, xl: 12 } }}>
                      
                      {/* HEADER SECTION */}
                      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-1.5px', color: '#0f172a' }}>
                              Market Intelligence
                            </Typography>
                            <Box sx={{ px: 1.5, py: 0.5, borderRadius: 2, bgcolor: alpha('#10b981', 0.1), display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 8, height: 8, bgcolor: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                                <Typography variant="caption" fontWeight={700} color="#10b981">LIVE</Typography>
                            </Box>
                          </Stack>
                          <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5, fontWeight: 500 }}>
                            AI-driven insights for data-backed decisions
                          </Typography>
                        </Box>
                        
                        <Button 
                          variant="contained" 
                          onClick={() => navigate("/upload")} 
                          startIcon={<CloudUploadIcon />}
                          sx={{ 
                              borderRadius: 4, px: 4, py: 1.5, textTransform: 'none', fontWeight: 800, 
                              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                              boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)',
                              '&:hover': { transform: 'translateY(-2px)' }
                          }}
                        >
                          Upload CSV Data
                        </Button>
                      </Box>

                      {/* --- 1. COMPACT STATUS BAR --- */}
                      <Grid container spacing={2} mb={5}>
                        <Grid item xs={12} sm={6} md={2}>
                          {/* ✅ UPDATED: KPI Card now uses universeCount from folder analytics stats */}
                          <KpiCard 
                            title="Universe" 
                            value={universeCount} 
                            icon={<AutoGraphIcon />} 
                            color="#6366f1" 
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                          <KpiCard title="AI Signals" value="Optimal" icon={<AccountBalanceWalletIcon />} color="#ec4899" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <InsightItem 
                            title="Global Market High" 
                            stock={stats?.highestPrice} 
                            icon={<TrendingUpIcon sx={{ color: "#10b981" }} />} 
                            color="#10b981"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <InsightItem 
                            title="Global Market Low" 
                            stock={stats?.lowestPrice} 
                            icon={<TrendingDownIcon sx={{ color: "#ef4444" }} />} 
                            color="#ef4444"
                          />
                        </Grid>
                      </Grid>

                      {/* --- 2. ENLARGED VISUALIZATION GRID --- */}
                      <Grid container spacing={4} mb={6}>
                        <Grid item xs={12} lg={8}>
                          <Paper 
                            elevation={0} 
                            sx={{ 
                              p: 4, borderRadius: 8, border: "1px solid #f1f5f9", 
                              bgcolor: '#fff', height: '100%', minHeight: 650 
                            }}
                          >
                            <Typography variant="h5" fontWeight={900} color="#0f172a" mb={4}>
                              Price Leaders
                            </Typography>
                            <Box sx={{ height: 550 }}>
                              <TopStocksBar data={topStocks} onBarClick={(symbol) => handleChartClick(symbol)} />
                            </Box>
                          </Paper>
                        </Grid>

                        <Grid item xs={12} lg={4}>
                          <Card 
                            sx={{ 
                              borderRadius: 8, border: "1px solid #f1f5f9", 
                              height: '100%', minHeight: 650 
                            }}
                          >
                            <CardContent sx={{ p: 4 }}>
                              <Typography variant="h5" fontWeight={900} mb={4}>
                                Volume Distribution
                              </Typography>
                              <Box sx={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <VolumePie data={volumeData} />
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
              {/* --- 3. SECTOR ACCUMULATION TREND --- */}
              {/* --- 3. SECTOR ACCUMULATION TREND --- */}
              <Box sx={{ mb: 6 }}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 4, borderRadius: 8, border: "1px solid #f1f5f9", 
                    bgcolor: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' 
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                    <Box>
                      <Typography variant="h5" fontWeight={900} color="#0f172a">
                        Sector Accumulation Trend
                      </Typography>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        AGGREGATED PRICE MOVEMENT ACROSS ACTIVE UNIVERSE
                      </Typography>
                    </Box>
                    <Box sx={{ px: 2, py: 0.5, bgcolor: alpha('#6366f1', 0.1), borderRadius: 2 }}>
                      <Typography variant="caption" fontWeight={900} color="#6366f1">
                        BETA ANALYTICS
                      </Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ height: 350, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sectorTrendData}>
                        <defs>
                          <linearGradient id="sectorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        
                        {/* ✅ REMOVED: Horizontal lines by setting horizontal to false */}
                        <CartesianGrid horizontal={false} vertical={false} stroke="none" />
                        
                        {/* ✅ UPDATED: Added axisLine and tickLine false to remove the bottom border line */}
                        <XAxis 
                          dataKey="index" 
                          hide 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <YAxis 
                          hide 
                          domain={['auto', 'auto']} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        
                        <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const index = label;
                          const stock = sectorTrendData[index];

                          return (
                            <Box sx={{
                              bgcolor: "#fff",
                              p: 1.5,
                              borderRadius: 2,
                              boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
                            }}>
                              <Typography fontWeight={900}>
                                {stock?.symbol}
                              </Typography>
                              <Typography color="primary">
                                Close: ₹{payload[0].value.toLocaleString()}
                              </Typography>
                            </Box>
                          );
                        }}
                      />
                        <Area 
                          type="monotone" 
                          dataKey="close" 
                          stroke="#6366f1" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#sectorGradient)" 
                          animationDuration={2000}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Box>
                      {/* --- 4. LANDSCAPE WATCHLIST PORTFOLIO --- */}
                      <Box sx={{ mt: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={3}>
                          <Typography variant="h4" fontWeight={900} color="#0f172a">Watchlist </Typography>
                          <Typography 
                            variant="body2" 
                            color="primary" 
                            fontWeight={800} 
                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: '' }}}
                            onClick={() => navigate('/watchlist-all')}
                          >
                            View All Assets →
                          </Typography>
                        </Stack>
                        <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 4 }}>
                          {watchlist.length === 0 ? (
                            <Box sx={{ p: 8, width: '100%', textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: 8 }}>
                              <Typography variant="body1" color="text.secondary">No assets being monitored.</Typography>
                            </Box>
                          ) : (
                            watchlist.map((stock) => <PortfolioCard key={stock.symbol} stock={stock} />)
                          )}
                        </Box>
                      </Box>

                      <Button variant="contained" onClick={() => navigate("/chat")} sx={fabStyle} startIcon={<ChatBubbleIcon />}>
                        Ask AI Advisor
                      </Button>

                      <StockDetailModal 
                        open={isModalOpen} 
                        onClose={() => setIsModalOpen(false)} 
                        symbol={selectedStock} 
                        data={stockDetailData} 
                      />

                    </Container>
                  </Box>
                );
              }

              // Stock Detail Table Modal
              function StockDetailModal({ open, onClose, symbol, data }) {
                return (
                  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 900 }}>
                      Dataset View: {symbol}
                      <IconButton onClick={onClose}><CloseIcon /></IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Close (₹)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Volume</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.slice(0, 20).map((row, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell>{row.date || "N/A"}</TableCell>
                              <TableCell>₹{row.close?.toLocaleString()}</TableCell>
                              <TableCell>{row.volume?.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </DialogContent>
                  </Dialog>
                );
              }

              /* --- REUSABLE COMPONENTS --- */
              function KpiCard({ title, value, color, icon }) {
                return (
                  <Card sx={{ borderRadius: 8, border: '1px solid #f1f5f9', height: '100%' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                        <Box sx={{ p: 1, borderRadius: 2.5, bgcolor: alpha(color, 0.1), color: color, display: 'flex' }}>
                          {icon}
                        </Box>
                        <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                          {title}
                        </Typography>
                      </Stack>
                      <Typography variant="h4" fontWeight={900}>
                        {/* If universeCount is 0, it still shows 0. If it's null, it shows the skeleton */}
                        {value !== null ? value : <Skeleton width="50px" />}
                      </Typography>
                    </CardContent>
                  </Card>
                );
              }

              function InsightItem({ title, stock, icon, color }) {
                return (
                  <Card sx={{ borderRadius: 8, border: '1px solid #f1f5f9', height: '100%' }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
                      <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: alpha(color, 0.1), display: 'flex' }}>
                        {icon}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                          {title}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="h5" fontWeight={900}>
                            {stock ? stock.symbol : <Skeleton width="80px" />}
                          </Typography>
                          <Typography variant="h6" fontWeight={900} sx={{ color: color }}>
                            {stock ? `₹${stock.close}` : ""}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              }

              const fabStyle = {
                position: 'fixed', bottom: 40, right: 40, borderRadius: 5, px: 4, py: 2.5,
                fontWeight: 900, background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', zIndex: 1000
              };  