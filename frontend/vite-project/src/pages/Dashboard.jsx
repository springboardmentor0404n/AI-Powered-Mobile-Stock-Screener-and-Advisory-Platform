import React from 'react';
import { Card, CardContent, SpeedDial, SpeedDialAction, Tooltip, Badge, Skeleton, Box, Typography } from "@mui/material";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import { Link as RouterLink } from 'react-router-dom';
import MainHeader from '../components/MainHeader';

export default function Dashboard() {
  const [loading, setLoading] = React.useState(false);
  const uploadedCount = 12;
  const activeCount = 4;

  return (
    <Box>
      <MainHeader title="AI-Powered Stock Screener And Advisory Platform" />

      <Box sx={{ p: 4 }}>
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '320px 1fr' } }}>
          <Box>
            <Card sx={{ background: 'linear-gradient(135deg,#ffffff,#f3f6ff)', transition: 'transform .18s', '&:hover': { transform: 'translateY(-6px)', boxShadow: 6 } }}>
              <CardContent>
                {loading ? (
                  <Skeleton variant="text" width={160} />
                ) : (
                  <>
                    <Typography variant="h6">Profile</Typography>
                    <Typography variant="body2" color="text.secondary">User information and quick actions</Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>

          <Box>
            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <Card sx={{ background: 'linear-gradient(135deg,#ffefeb,#fff7e6)', transition: 'transform .18s', '&:hover': { transform: 'translateY(-6px)', boxShadow: 6 } }}>
                <CardContent>
                  <Typography variant="h5" color="primary.main">
                    {loading ? <Skeleton variant="text" width={50} /> : <Badge badgeContent={uploadedCount} color="primary">{uploadedCount}</Badge>}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Uploaded files</Typography>
                </CardContent>
              </Card>
              <Card sx={{ background: 'linear-gradient(135deg,#e8f7ff,#eafcf8)', transition: 'transform .18s', '&:hover': { transform: 'translateY(-6px)', boxShadow: 6 } }}>
                <CardContent>
                  <Typography variant="h5" color="secondary.main">
                    {loading ? <Skeleton variant="text" width={30} /> : <Badge badgeContent={activeCount} color="secondary">{activeCount}</Badge>}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Active queries</Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Card sx={{ background: 'linear-gradient(135deg,#fff8ff,#f7f0ff)' }}>
                <CardContent>
                  <Typography variant="h6">Recent activity</Typography>
                  <Typography variant="body2" color="text.secondary">No recent activity.</Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>
      </Box>

      <SpeedDial
        ariaLabel="quick-actions"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        icon={<HomeIcon />}
      >
        <SpeedDialAction icon={<UploadFileIcon />} tooltipTitle="Upload" onClick={() => window.location.href = '/upload'} />
        <SpeedDialAction icon={<ChatBubbleIcon />} tooltipTitle="Chat" onClick={() => window.location.href = '/chat'} />
      </SpeedDial>
    </Box>
  );
}
