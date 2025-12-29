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
  Divider,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import StarBorderIcon from "@mui/icons-material/StarBorder"; // For Watchlist
import { useNavigate } from "react-router-dom";

import MainHeader from "../components/MainHeader";
import api from "../services/api";

/* Charts */
import TopStocksBar from "../components/charts/TopStocksBar";
import VolumePie from "../components/charts/VolumePie";
import { getTopStocks, getVolumeData } from "../services/analyticsApi";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [topStocks, setTopStocks] = useState([]);
  const [volumeData, setVolumeData] = useState([]);
  const navigate = useNavigate();

  /* KPI & CHART DATA FETCHING */
  useEffect(() => {
    // KPI Data
    api.post("/chat", { query: "all stocks" }).then((res) => {
      const rows = res.data?.data || [];
      if (!rows.length) return setStats({});

      const highestPrice = [...rows].sort((a, b) => Number(b.close || 0) - Number(a.close || 0))[0];
      const highestVolume = [...rows].sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0))[0];

      setStats({
        total: rows.length,
        highestPrice,
        highestVolume,
      });
    });

    // Analytics Data
    getTopStocks().then((res) => setTopStocks(res.data || []));
    getVolumeData().then((res) => setVolumeData(res.data || []));
  }, []);

  return (
    <Box sx={{ backgroundColor: "#f8fafc", minHeight: "100vh", pb: 10 }}>
      <MainHeader title="AI Stock Screener" />

      <Container maxWidth={false} sx={{ px: { xs: 2, md: 5 }, pt: 4 }}>
        {/* HEADER SECTION */}
        <Box mb={4} display="flex" justifyContent="space-between" alignItems="flex-end">
          <Box>
            <Typography variant="h4" fontWeight={800} color="#1e293b">
              Market Dashboard
            </Typography>
            <Typography color="text.secondary">
              Real-time analytics and AI-powered stock insights
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} sx={{ display: { xs: 'none', md: 'flex' } }}>
             <Button variant="outlined" startIcon={<StarBorderIcon />}>Watchlist</Button>
             <Button variant="contained" onClick={() => navigate("/upload")} startIcon={<UploadFileIcon />}>Upload CSV</Button>
          </Stack>
        </Box>

        {/* KPI SECTION */}
        <Grid container spacing={3} mb={5}>
          <KpiCard title="Total Stocks" value={stats?.total} color="#6366f1" />
          <KpiCard title="Highest Price" value={stats?.highestPrice?.close ? `₹${stats.highestPrice.close}` : null} color="#10b981" />
          <KpiCard title="Peak Volume" value={stats?.highestVolume?.volume?.toLocaleString()} color="#f59e0b" />
          <KpiCard title="System Status" value="AI Active" color="#ec4899" />
        </Grid>

        <Grid container spacing={4}>
          {/* LEFT COLUMN: VISUALIZATIONS */}
          <Grid item xs={12} lg={8}>
            <Stack spacing={4}>
              {/* BAR CHART */}
              <Card sx={{ borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight={700} mb={3}>Top Performers by Price</Typography>
                  <Box sx={{ height: 400 }}>
                    <TopStocksBar data={topStocks} />
                  </Box>
                </CardContent>
              </Card>

              {/* INSIGHTS SUB-GRID */}
              <Grid container spacing={3}>
                <InsightItem 
                  title="Price Leader" 
                  stock={stats?.highestPrice} 
                  icon={<TrendingUpIcon sx={{ color: "#6366f1" }} />} 
                />
                <InsightItem 
                  title="Volume Leader" 
                  stock={stats?.highestVolume} 
                  icon={<BarChartIcon sx={{ color: "#10b981" }} />} 
                />
              </Grid>
            </Stack>
          </Grid>

          {/* RIGHT COLUMN: DISTRIBUTION & WATCHLIST */}
          <Grid item xs={12} lg={4}>
            <Stack spacing={4}>
              {/* PIE CHART */}
              <Card sx={{ borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight={700} mb={3}>Volume Distribution</Typography>
                  <Box sx={{ height: 350 }}>
                    <VolumePie data={volumeData} />
                  </Box>
                </CardContent>
              </Card>

              {/* SPRINT 3 PLACEHOLDER: WATCHLIST */}
              <Card sx={{ borderRadius: 4, bgcolor: "#fff", border: "2px dashed #cbd5e1" }}>
                <CardContent sx={{ p: 4, textAlign: 'center', py: 8 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="#64748b">
                    My Watchlist
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Track your favorite stocks here in Sprint 3
                  </Typography>
                  <Button variant="text" size="small">+ Configure Portfolio</Button>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>

        {/* FLOATING CHAT BUTTON */}
        <Button
          variant="contained"
          onClick={() => navigate("/chat")}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            borderRadius: 50,
            px: 4,
            py: 1.5,
            boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600
          }}
          startIcon={<ChatBubbleIcon />}
        >
          Ask AI Assistant
        </Button>
      </Container>
    </Box>
  );
}

/* ---------- UI COMPONENTS ---------- */

function KpiCard({ title, value, color }) {
  return (
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ borderRadius: 3, borderLeft: `6px solid ${color}` }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={800} mt={1}>
            {value ?? <Skeleton width="60%" />}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

function InsightItem({ title, stock, icon }) {
  return (
    <Grid item xs={12} md={6}>
      <Card sx={{ borderRadius: 3, boxShadow: "none", border: "1px solid #e2e8f0" }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f1f5f9" }}>{icon}</Box>
          <Box>
            <Typography variant="caption" color="text.secondary">{title}</Typography>
            <Typography fontWeight={700}>
              {stock ? `${stock.symbol} (${stock.close})` : <Skeleton width={100} />}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}