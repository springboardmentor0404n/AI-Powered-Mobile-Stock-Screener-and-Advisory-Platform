import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton,
  Chip, Switch, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem,
  Alert, Grid, Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../services/api';

const AlertManagement = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/analytics/alerts/user');
      setAlerts(response.data.alerts || []);
      setError('');
    } catch (err) {
      setError('Failed to load alerts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleToggleActive = async (alertId, currentActive) => {
    try {
      await api.put(`/analytics/alerts/${alertId}`, {
        is_active: !currentActive
      });
      fetchAlerts();
    } catch (err) {
      console.error('Error toggling alert:', err);
    }
  };

  const handleDelete = async (alertId) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      try {
        await api.delete(`/analytics/alerts/${alertId}`);
        fetchAlerts();
      } catch (err) {
        console.error('Error deleting alert:', err);
      }
    }
  };

  const handleEditClick = (alert) => {
    setCurrentAlert(alert);
    setEditValue(alert.value);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!currentAlert || !editValue || isNaN(parseFloat(editValue))) {
      return;
    }

    setEditLoading(true);
    try {
      await api.put(`/analytics/alerts/${currentAlert.id}`, {
        value: parseFloat(editValue)
      });
      fetchAlerts();
      setEditDialogOpen(false);
    } catch (err) {
      console.error('Error updating alert:', err);
    } finally {
      setEditLoading(false);
    }
  };

  const getAlertTypeColor = (type) => {
    switch (type) {
      case 'PRICE_THRESHOLD': return 'primary';
      case 'PERCENT_CHANGE': return 'secondary';
      case 'VOLUME_SPIKE': return 'info';
      default: return 'default';
    }
  };

  const getConditionSymbol = (condition) => {
    switch (condition) {
      case 'ABOVE': return '>';
      case 'BELOW': return '<';
      case 'EQUALS': return '=';
      default: return condition;
    }
  };

  if (loading) {
    return <Typography>Loading alerts...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Alert Management</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAlerts}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              // Open create alert modal or navigate
            }}
          >
            Create Alert
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Condition</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Triggered</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell>
                  <Typography fontWeight="bold">{alert.symbol}</Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={alert.alert_type.replace('_', ' ')}
                    size="small"
                    color={getAlertTypeColor(alert.alert_type)}
                  />
                </TableCell>
                <TableCell>
                  <Typography>
                    {getConditionSymbol(alert.condition)} 
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography>
                    {alert.value}
                    {alert.alert_type === 'PERCENT_CHANGE' ? '%' : ''}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={alert.is_active}
                    onChange={() => handleToggleActive(alert.id, alert.is_active)}
                    size="small"
                  />
                  <Chip
                    label={alert.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    color={alert.is_active ? 'success' : 'default'}
                    sx={{ ml: 1 }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  {alert.times_triggered > 0 ? (
                    <Tooltip title={`Last triggered: ${alert.last_triggered}`}>
                      <Chip 
                        label={alert.times_triggered}
                        size="small"
                        color="warning"
                      />
                    </Tooltip>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Never
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    onClick={() => handleEditClick(alert)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDelete(alert.id)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {alerts.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">
            No alerts created yet. Create your first alert to get notified about price changes.
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }}>
            Create First Alert
          </Button>
        </Box>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Alert Value</DialogTitle>
        <DialogContent>
          {currentAlert && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Alert for {currentAlert.symbol}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="New Value"
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  helperText={
                    currentAlert.alert_type === 'PERCENT_CHANGE'
                      ? 'Percentage value'
                      : 'Threshold value'
                  }
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEditSubmit} 
            variant="contained"
            disabled={editLoading}
          >
            {editLoading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertManagement;