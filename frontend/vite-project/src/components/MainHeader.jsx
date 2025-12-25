import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Tooltip } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link as RouterLink } from 'react-router-dom';
import { logout } from '../utils/auth';

export default function MainHeader({ title = 'AI-Powered Stock Screener' }){
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">{title}</Typography>

        <Box>
          <Tooltip title="Upload CSV">
            <Button component={RouterLink} to="/upload" startIcon={<UploadFileIcon />} sx={{ mr: 1 }}>Upload</Button>
          </Tooltip>
          <Tooltip title="Chat Assistant">
            <Button component={RouterLink} to="/chat" startIcon={<ChatBubbleIcon />} sx={{ mr: 1 }}>Chat</Button>
          </Tooltip>
          <Tooltip title="Logout">
            <Button color="error" startIcon={<LogoutIcon />} onClick={logout}>Logout</Button>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
