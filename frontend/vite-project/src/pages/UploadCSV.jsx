import { Box, Button, Typography } from "@mui/material";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import api from "../services/api";
import { useState } from "react";
import { useToast } from '../components/ToastProvider';

export default function UploadCSV() {
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
      try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post("/upload-csv", formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast?.showToast('Upload successful', 'success');
    } catch (e) {
      toast?.showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box p={4}>
      <Typography variant="h6" gutterBottom>Upload CSV</Typography>
      <label>
        <input
          accept=".csv"
          style={{ display: 'none' }}
          type="file"
          onChange={(e) => upload(e.target.files[0])}
        />
        <Button variant="contained" component="span" startIcon={<UploadFileIcon />} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Choose CSV'}
        </Button>
      </label>

      {/* Global ToastProvider displays toasts */}
    </Box>
  );
}
