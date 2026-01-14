import React, { useState, useEffect } from 'react';
import {
  Badge, IconButton, Menu, MenuItem, Typography,
  Box, Divider, List, ListItem, ListItemText,
  Button, Chip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import api from '../services/api';

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/analytics/notifications?unread_only=true&limit=10');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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
      await api.post('/analytics/notifications/mark-read', {
        notification_ids: notificationIds
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
    // Navigate or perform action based on notification type
    handleClose();
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 360, maxHeight: 400 }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Button 
              size="small" 
              onClick={markAllAsRead}
              disabled={loading}
            >
              Mark all as read
            </Button>
          )}
        </Box>
        
        <Divider />

        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText 
                primary="No new notifications" 
                secondary="You're all caught up!"
              />
            </ListItem>
          ) : (
            notifications.map((notification) => (
              <ListItem 
                key={notification.id}
                button
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  backgroundColor: notification.is_read ? 'transparent' : 'action.hover',
                  borderLeft: notification.is_read ? 'none' : '4px solid',
                  borderLeftColor: 'primary.main'
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2" noWrap>
                        {notification.title}
                      </Typography>
                      {notification.type === 'ALERT' && (
                        <Chip label="Alert" size="small" color="warning" />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notification.created_at).toLocaleString()}
                      </Typography>
                    </>
                  }
                  primaryTypographyProps={{ noWrap: true }}
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))
          )}
        </List>

        <Divider />
        
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button 
            size="small" 
            onClick={() => {
              // Navigate to full notifications page
              handleClose();
            }}
          >
            View All Notifications
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationBell;