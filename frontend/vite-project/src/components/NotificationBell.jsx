import React, { useState, useEffect, useCallback } from 'react';
import {
  Badge, IconButton, Menu, Typography,
  Box, Divider, List, ListItem, ListItemText,
  Button, Chip, alpha
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import api from '../services/api';

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // UPDATED: Dynamically get user ID from LocalStorage
  const [userId] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).id : 5; // Default to 5 (Naga)
  });

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      // UPDATED PATH: Using the /alerts prefix defined in your __init__.py
      const response = await api.get(`/alerts/notifications/${userId}`, {
        params: { unread_only: true, limit: 10 }
      });
      
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = async (notificationIds = []) => {
    setLoading(true);
    try {
      // UPDATED PATH: Hits the mark-read endpoint in your alerts blueprint
      await api.post('/alerts/notifications/mark-read', {
        user_id: userId,
        notification_ids: notificationIds,
        mark_all: notificationIds.length === 0
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    await markAsRead([]);
    handleClose();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead([notification.id]);
    }
    handleClose();
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon sx={{ color: '#ec4899' }} /> {/* Match Dashboard Pink */}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { 
            width: 360, 
            maxHeight: 480, 
            borderRadius: 3,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            mt: 1.5
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={800}>Notifications</Typography>
          {unreadCount > 0 && (
            <Button 
              size="small" 
              onClick={markAllAsRead}
              disabled={loading}
              sx={{ fontWeight: 800, textTransform: 'none' }}
            >
              Mark all read
            </Button>
          )}
        </Box>
        
        <Divider />

        <List sx={{ p: 0 }}>
          {notifications.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                No new alerts. You're all caught up!
              </Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <ListItem 
                key={notification.id}
                button
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  py: 2,
                  px: 2,
                  backgroundColor: notification.is_read ? 'transparent' : alpha('#6366f1', 0.04),
                  borderLeft: notification.is_read ? '4px solid transparent' : '4px solid #6366f1',
                  '&:hover': { backgroundColor: alpha('#6366f1', 0.08) }
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography variant="subtitle2" fontWeight={900} color="#1e293b">
                        {notification.title}
                      </Typography>
                      {notification.type === 'ALERT' && (
                        <Chip label="Stock" size="small" color="secondary" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 900 }} />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="#475569" sx={{ mb: 0.5, lineHeight: 1.4 }}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))
          )}
        </List>

        <Divider />
        
        <Box sx={{ p: 1.5 }}>
          <Button 
            fullWidth
            variant="text"
            size="small" 
            onClick={handleClose}
            sx={{ fontWeight: 800, color: '#64748b', textTransform: 'none' }}
          >
            Close Panel
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationBell;