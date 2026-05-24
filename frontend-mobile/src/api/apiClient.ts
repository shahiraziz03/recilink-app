import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Android Emulator: 10.0.2.2 maps to localhost on your machine
// Physical Device: use your machine's local WiFi IP
const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000/api/v1'
  : 'http://10.167.49.82:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach JWT token to every request if available
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;