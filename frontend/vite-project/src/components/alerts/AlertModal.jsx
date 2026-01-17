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
    // 1. Validation for the input value
    if (!value || isNaN(parseFloat(value))) {
      setError('Please enter a valid value');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 2. RETRIEVE USER FROM LOCAL STORAGE
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : { id: 5 }; // Fallback to Naga ID 5

      if (!user || !user.id) {
        throw new Error("User session expired. Please log in again.");
      }

      // 3. SEND POST REQUEST
      // FIX: Path adjusted to explicitly hit the root /alerts blueprint registered in __init__.py
      await api.post('/alerts/create', {
        symbol: symbol || '',
        alert_type: alertType, // Ensures 'PRICE_THRESHOLD', 'PERCENT_CHANGE', etc. match alerts.py
        condition: condition,   // Ensures 'ABOVE', 'BELOW', 'EQUALS' match alerts.py
        value: parseFloat(value),
        user_id: user.id 
      });

      // 4. Handle success
      onAlertCreated();
      onClose();
      
      // Reset form fields
      setAlertType('PRICE_THRESHOLD');
      setCondition('ABOVE');
      setValue('');
    } catch (err) {
      console.error("Alert Creation Error:", err);
      // Ensures the "Processing" state clears by showing the error message
      setError(err.response?.data?.error || err.message || 'Failed to create alert');
    } finally {
      // ALWAYS stop loading so the button doesn't stay stuck
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        Create Stock Alert
        {symbol && (
          <Typography variant="subtitle2" color="primary" fontWeight={700}>
            Asset: {symbol}
          </Typography>
        )}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontWeight: 600 }}>{error}</Alert>
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
                <MenuItem value="ABOVE">Price Above (&gt;)</MenuItem>
                <MenuItem value="BELOW">Price Below (&lt;)</MenuItem>
                <MenuItem value="EQUALS">Price Equals (=)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Target Value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              size="small"
              placeholder="e.g. 2500.50"
              helperText={
                alertType === 'PERCENT_CHANGE' 
                  ? 'Triggers on % move from last close'
                  : 'Triggers when price crosses this level'
              }
            />
          </Grid>

          {alertType === 'PRICE_THRESHOLD' && value && (
            <Grid item xs={12}>
              <Alert severity="info" sx={{ fontWeight: 500 }}>
                Notify me when <strong>{symbol}</strong> goes <strong>{condition.toLowerCase()}</strong> ₹{parseFloat(value).toLocaleString()}
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={loading} sx={{ fontWeight: 700 }}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          sx={{ fontWeight: 900, px: 3, borderRadius: 2 }}
        >
          {loading ? 'Processing...' : 'Create Alert'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertModal;