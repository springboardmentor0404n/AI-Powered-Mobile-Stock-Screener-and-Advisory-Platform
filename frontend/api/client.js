import axios from 'axios';
import { Platform } from 'react-native';

// For Android Emulator, use 10.0.2.2. For iOS/Web/Physical Device, needs adjustment.
// Assuming Android Emulator for now as per "Mobile" context often defaults to this.
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const client = axios.create({
    baseURL: BASE_URL,
});

export default client;
