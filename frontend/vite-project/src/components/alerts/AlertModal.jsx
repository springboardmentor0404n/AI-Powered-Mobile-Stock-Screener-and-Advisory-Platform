import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Select, MenuItem, FormControl,
  InputLabel, Grid, Typography, Box, Alert
} from '@mui/material';
import api from '../../services/api';

const AlertModal = ({ open, onClose, symbol, onAlertCreated }) => {
  const [alertType, setAlertType] = useState('PRICE_THRESHOLD');
  const [condition, setCondition] = useState('ABOVE');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!value || isNaN(parseFloat(value))) {
      setError('Please enter a valid value');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/analytics/alerts/create', {
        symbol: symbol || '',
        alert_type: alertType,
        condition,
        value: parseFloat(value)
      });

      onAlertCreated();
      onClose();
      // Reset form
      setAlertType('PRICE_THRESHOLD');
      setCondition('ABOVE');
      setValue('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Create Stock Alert</Typography>
        {symbol && (
          <Typography variant="subtitle2" color="primary">
            For: {symbol}
          </Typography>
        )}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Alert Type</InputLabel>
              <Select
                value={alertType}
                label="Alert Type"
                onChange={(e) => setAlertType(e.target.value)}
              >
                <MenuItem value="PRICE_THRESHOLD">Price Threshold</MenuItem>
                <MenuItem value="PERCENT_CHANGE">Percentage Change</MenuItem>
                <MenuItem value="VOLUME_SPIKE">Volume Spike</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Condition</InputLabel>
              <Select
                value={condition}
                label="Condition"
                onChange={(e) => setCondition(e.target.value)}
              >
                <MenuItem value="ABOVE">Above</MenuItem>
                <MenuItem value="BELOW">Below</MenuItem>
                <MenuItem value="EQUALS">Equals</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              size="small"
              helperText={
                alertType === 'PERCENT_CHANGE' 
                  ? 'Percentage change (e.g., 5 for 5%)'
                  : alertType === 'PRICE_THRESHOLD'
                  ? 'Price threshold'
                  : 'Volume threshold'
              }
            />
          </Grid>

          {alertType === 'PRICE_THRESHOLD' && (
            <Grid item xs={12}>
              <Alert severity="info">
                Get notified when price goes {condition.toLowerCase()} {value || 'your value'}
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Alert'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertModal;