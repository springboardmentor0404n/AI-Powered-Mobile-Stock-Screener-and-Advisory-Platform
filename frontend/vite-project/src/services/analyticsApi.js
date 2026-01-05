import axios from "axios";

const API_BASE = "http://127.0.0.1:5000";

export const getTopStocks = () =>
  axios.get(`${API_BASE}/analytics/top-stocks`);

export const getVolumeData = () =>
  axios.get(`${API_BASE}/analytics/volume`);

export const getSectorTrend = () =>
  axios.get(`${API_BASE}/analytics/sector-trend`);
