import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  List,
  ListItem,
  Paper,
  Typography,
  Stack,
  Divider
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useToast } from "../components/ToastProvider";

export default function Chat() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const toast = useToast();

  const ask = async () => {
    if (!query.trim()) return;

    // User message
    setMessages(prev => [...prev, { role: "user", text: query }]);
    const q = query;
    setQuery("");

    try {
      const response = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q })
      });

      const data = await response.json();

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          payload: data
        }
      ]);

      toast?.showToast("Response received", "success");

    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: "⚠️ Unable to fetch server response" }
      ]);
      toast?.showToast("Server issue", "warning");
    }
  };

  return (
    <Box p={4}>
      <Typography variant="h5" gutterBottom>Chat</Typography>

      <Paper sx={{ maxHeight: 420, overflow: "auto", mb: 2, p: 2 }}>
        <List>
          {messages.map((m, i) => (
            <ListItem key={i} alignItems="flex-start">
              {m.role === "user" ? (
                <Typography
                  sx={{
                    ml: "auto",
                    bgcolor: "#e3f2fd",
                    p: 1.2,
                    borderRadius: 2,
                    maxWidth: "75%"
                  }}
                >
                  {m.text}
                </Typography>
              ) : (
                <Box
                  sx={{
                    bgcolor: "#f1f8e9",
                    p: 2,
                    borderRadius: 2,
                    width: "100%"
                  }}
                >
                  {/* Greeting / Info message */}
                  {m.payload?.message && (
                    <Typography sx={{ whiteSpace: "pre-line" }}>
                      {m.payload.message}
                    </Typography>
                  )}

                  {/* Error */}
                  {m.payload?.type === "error" && (
                    <Typography color="error">
                      ❌ {m.payload.message}
                    </Typography>
                  )}

                  {/* Results */}
                  {Array.isArray(m.payload?.data) && (
                    <>
                      <Typography variant="subtitle2">
                        Results Found: {m.payload.data.length}
                      </Typography>
                      <Divider sx={{ my: 1 }} />

                      {m.payload.data.slice(0, 15).map((row, idx) => {
                        // 🔥 SAFE FIELD ACCESS (VERY IMPORTANT)
                        const symbol =
                          row.symbol || row.Symbol || row.stock || "N/A";

                        const close =
                          row.close ?? row.Close ?? row.last ?? "—";

                        const volume =
                          row.volume ?? row.Volume ?? row.vol ?? "—";

                        return (
                          <Typography key={idx} sx={{ fontSize: 13 }}>
                            📈 <b>{symbol}</b> | Close: {close} | Vol: {volume}
                          </Typography>
                        );
                      })}
                    </>
                  )}
                </Box>
              )}
            </ListItem>
          ))}
        </List>
      </Paper>

      <Stack direction="row" spacing={2}>
        <TextField
          fullWidth
          placeholder="Ask stock query (e.g. Close > 100)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
        />
        <Button variant="contained" endIcon={<SendIcon />} onClick={ask}>
          Ask
        </Button>
      </Stack>
    </Box>
  );
}
