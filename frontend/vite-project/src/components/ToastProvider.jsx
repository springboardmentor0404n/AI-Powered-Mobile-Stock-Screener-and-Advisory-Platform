import React, { createContext, useContext, useState, useCallback } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState({ message: '', severity: 'info' });

  const showToast = useCallback((message, severity = 'info') => {
    setOpts({ message, severity });
    setOpen(true);
  }, []);

  const handleClose = useCallback((event, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar open={open} autoHideDuration={3000} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleClose} severity={opts.severity} sx={{ width: '100%' }}>
          {opts.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
