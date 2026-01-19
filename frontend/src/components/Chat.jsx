import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserFromToken } from "../utils/auth";
import {
  Box,
  Button,
  TextField,
  Typography,
  AppBar,
  Toolbar,
  Avatar,
  Paper,
} from "@mui/material";
import "./Chat.css";

export default function Chat() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const username = getUserFromToken();

  // 🌗 THEME STATE (ONLY ADDITION)
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  // 🚫 Redirect if not logged in
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const askQuestion = async () => {
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5001/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: currentQuestion }),
      });

      const data = await res.json();

      setHistory((prev) => [
        ...prev,
        { q: currentQuestion, a: data.answer || "No response" },
      ]);
    } catch {
      setHistory((prev) => [
        ...prev,
        { q: currentQuestion, a: "Server error. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const ChatBubble = ({ text, isUser }) => (
    <Box
      display="flex"
      justifyContent={isUser ? "flex-end" : "flex-start"}
      mb={1.5}
    >
      <Paper
        elevation={2}
        sx={{
          maxWidth: "75%",
          px: 2,
          py: 1.2,
          borderRadius: 2,
          bgcolor: isUser ? "primary.main" : "background.paper",
          color: isUser ? "#fff" : "text.primary",
          whiteSpace: "pre-wrap",
        }}
      >
        <Typography variant="body2">{text}</Typography>
      </Paper>
    </Box>
  );

  return (
    <Box className="chat-page">
      {/* 🔝 TOP BAR */}
      <AppBar position="static" className="chat-appbar">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Button color="inherit" onClick={() => navigate("/")}>
            ⬅ Dashboard
          </Button>

          <Box display="flex" alignItems="center" gap={2}>
            {/* 🌗 THEME TOGGLE */}
            <Button
              color="inherit"
              onClick={() =>
                setTheme(theme === "light" ? "dark" : "light")
              }
            >
              {theme === "light" ? "🌙 Dark" : "☀️ Light"}
            </Button>

            <Avatar className="chat-avatar">
              {username?.charAt(0).toUpperCase()}
            </Avatar>

            <Button color="inherit" onClick={logout}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 💬 CHAT CONTAINER */}
      <Box className="chat-container">
        <Typography variant="h6">Ask Financial Questions</Typography>

        {/* CHAT HISTORY */}
        <Box className="chat-history">
          {history.map((item, i) => (
            <Box key={i}>
              <ChatBubble text={item.q} isUser />
              <ChatBubble text={item.a} />
            </Box>
          ))}

          {loading && <ChatBubble text="Typing..." />}
        </Box>

        {/* INPUT BAR */}
        <Box className="chat-input">
          <TextField
            fullWidth
            multiline
            minRows={2}
            placeholder="Type your question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!loading) askQuestion();
              }
            }}
          />

          <Button
            variant="contained"
            disabled={loading}
            onClick={askQuestion}
          >
            Ask
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
