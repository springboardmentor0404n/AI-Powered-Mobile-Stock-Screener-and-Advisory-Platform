import { Box, Paper, Typography, Avatar } from "@mui/material";
import Background from "./Background";

export default function AuthLayout({ title, children }) {
  return (
    <>
      <Background />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: 'transparent',
          p: 2
        }}
      >
        <Paper sx={{ p: 4, width: { xs: '92%', sm: 420 }, borderRadius: 3, boxShadow: 6, bgcolor: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(6px)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>AI</Avatar>
            <Typography variant="h6" fontWeight="bold">{title}</Typography>
          </Box>
          {children}
        </Paper>
      </Box>
    </>
  );
}
