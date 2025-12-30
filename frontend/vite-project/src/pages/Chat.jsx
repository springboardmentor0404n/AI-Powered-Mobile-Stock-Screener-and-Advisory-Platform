import { useState, useRef, useEffect } from "react";
import {
  Box, TextField, Button, Paper, Typography, Stack, Chip, 
  CircularProgress, Avatar, IconButton, alpha, Tooltip, Zoom
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useToast } from "../components/ToastProvider";
import { useWatchlistStore } from "../store/useWatchlistStore";

export default function Chat() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const bottomRef = useRef(null);
  
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlistStore();

  const suggestedQueries = [
    "top 5 stocks",
    "high volume stocks",
    "stocks under ₹500",
    "bajaj performance",
    "best gainers today",
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const isInWatchlist = (symbol) => watchlist.some(s => s.symbol === symbol);

  const ask = async (customQuery) => {
    const q = customQuery || query;
    if (!q.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuery("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", payload: data }]);
    } catch (err) {
      toast?.showToast("AI Service unreachable", "error");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Server connection error. Please verify your Python backend is running on port 5000." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      height: 'calc(100vh - 120px)', 
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: '#fdfdff',
      p: { xs: 2, md: 4 } 
    }}>
      
      {/* 1. INSTITUTIONAL HEADER */}
      <Paper elevation={0} sx={{ 
        p: 2.5, mb: 3, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        bgcolor: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)'
      }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: alpha('#4f46e5', 0.1), color: '#4f46e5', width: 48, height: 48 }}>
            <SmartToyIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ color: '#0f172a' }}>
              Market Advisor AI
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 8, height: 8, bgcolor: '#10b981', borderRadius: '50%' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={800}>
                GEMINI • LIVE ANALYTICS
              </Typography>
            </Stack>
          </Box>
        </Stack>
        <Tooltip title="Chat Info">
          <IconButton size="small"><HelpOutlineIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Paper>

      {/* 2. CHAT FEED */}
      <Box sx={{ 
        flexGrow: 1, overflowY: "auto", px: 1, mb: 3,
        display: 'flex', flexDirection: 'column', gap: 3,
        '&::-webkit-scrollbar': { width: '5px' },
        '&::-webkit-scrollbar-thumb': { bgcolor: '#e2e8f0', borderRadius: '10px' }
      }}>
        {messages.length === 0 && (
          <Box textAlign="center" py={10}>
            <Typography variant="h4" fontWeight={900} color="#0f172a" gutterBottom>
              Welcome back.
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4} fontWeight={500}>
              Ask me about market trends, specific tickers, or volume surges.
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap>
              {suggestedQueries.map((q) => (
                <Chip
                  key={q} label={q} onClick={() => ask(q)}
                  sx={{ 
                    borderRadius: 3, px: 1, fontWeight: 700, bgcolor: '#fff', border: '1px solid #e2e8f0',
                    '&:hover': { bgcolor: '#4f46e5', color: '#fff', borderColor: '#4f46e5' } 
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {messages.map((m, i) => (
          <Zoom in={true} style={{ transitionDelay: '100ms' }} key={i}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: m.role === "user" ? "row-reverse" : "row", 
              gap: 2, alignItems: 'flex-start'
            }}>
              <Avatar sx={{ 
                width: 36, height: 36, fontWeight: 800, fontSize: '0.8rem',
                bgcolor: m.role === "user" ? "#0f172a" : "#4f46e5",
              }}>
                {m.role === "user" ? "ME" : "AI"}
              </Avatar>

              <Box sx={{ maxWidth: '75%' }}>
                <Paper sx={{ 
                  p: 2.5, 
                  borderRadius: m.role === "user" ? '24px 4px 24px 24px' : '4px 24px 24px 24px',
                  bgcolor: m.role === "user" ? "#4f46e5" : "#fff",
                  color: m.role === "user" ? "#fff" : "#1e293b",
                  border: m.role === "user" ? 'none' : '1px solid #f1f5f9',
                  boxShadow: m.role === "user" ? '0 10px 20px -5px rgba(79, 70, 229, 0.4)' : '0 4px 15px rgba(0,0,0,0.03)'
                }}>
                  {m.text && <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.6 }}>{m.text}</Typography>}
                  
                  {m.payload && (
                    <Box>
                      <Typography variant="body1" sx={{ whiteSpace: "pre-line", fontWeight: 600, mb: m.payload.data?.length > 0 ? 2 : 0 }}>
                        {m.payload.message}
                      </Typography>

                      {Array.isArray(m.payload?.data) && (
                        <Stack spacing={1.5}>
                          {m.payload.data.map((row, idx) => (
                            <Paper key={idx} variant="outlined" sx={{ 
                              p: 2, borderRadius: 4, display: "flex", justifyContent: "space-between", 
                              alignItems: "center", bgcolor: '#fdfdff', border: '1px solid #f1f5f9',
                              '&:hover': { transform: 'scale(1.02)', transition: '0.2s' }
                            }}>
                              <Box>
                                <Typography variant="subtitle1" fontWeight={900}>{row.symbol}</Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={800}>
                                  VOL: {Number(row.volume).toLocaleString()}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Typography variant="h6" fontWeight={900} color="#4f46e5">₹{row.close}</Typography>
                                <Tooltip title={isInWatchlist(row.symbol) ? "Remove" : "Add"}>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => {
                                      if(isInWatchlist(row.symbol)) {
                                        removeFromWatchlist(row.symbol);
                                        toast?.showToast(`${row.symbol} removed`, "info");
                                      } else {
                                        addToWatchlist(row);
                                        toast?.showToast(`${row.symbol} added to watchlist`, "success");
                                      }
                                    }}
                                    sx={{ bgcolor: alpha('#4f46e5', 0.05) }}
                                  >
                                    {isInWatchlist(row.symbol) ? 
                                      <StarIcon fontSize="small" sx={{ color: '#f59e0b' }} /> : 
                                      <StarBorderIcon fontSize="small" />
                                    }
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>
          </Zoom>
        ))}

        {loading && (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} thickness={5} sx={{ color: '#4f46e5' }} />
            <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 1 }}>
              CONSULTING MARKET DATA...
            </Typography>
          </Stack>
        )}
        <div ref={bottomRef} />
      </Box>

      {/* 3. INPUT BAR */}
      <Paper elevation={0} sx={{ 
        p: 1, borderRadius: 10, border: '1px solid #f1f5f9', 
        bgcolor: '#fff', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.1)',
        display: 'flex', alignItems: 'center'
      }}>
        <TextField
          fullWidth placeholder="Ask about top gainers, volume spikes, or specific stocks..."
          value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          sx={{
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            "& .MuiInputBase-input": { fontWeight: 600, px: 3 }
          }}
        />
        <Button
          variant="contained" onClick={() => ask()} disabled={loading}
          sx={{ 
            borderRadius: 10, px: 4, py: 1.5, fontWeight: 900,
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            boxShadow: '0 10px 20px rgba(79, 70, 229, 0.3)',
            minWidth: 120
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "SEND"}
        </Button>
      </Paper>
    </Box>
  );
}