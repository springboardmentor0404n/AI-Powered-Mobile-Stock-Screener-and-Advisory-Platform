import { Platform } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

// Universal fetch wrapper that works on both web and native
async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  console.log(`[API Request] ${options.method || 'GET'} ${url}`);
  try {
    const response = await fetch(url, config);
    console.log(`[API Response] ${response.status} ${url}`);

    // Try to parse JSON, if fails, use text
    let data;
    const contentType = response.headers.get("content-type");
    try {
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        // Try to parse text as JSON just in case content-type is wrong
        try {
          data = JSON.parse(text);
        } catch {
          data = { detail: text || response.statusText };
        }
      }
    } catch (e) {
      data = { detail: response.statusText };
    }

    if (!response.ok) {
      throw new Error(data.detail || 'Request failed');
    }

    return data;
  } catch (error: any) {
    // reduce noise for auth errors
    if (error.message && (error.message.includes('401') || error.message.includes('Invalid authentication'))) {
      console.warn(`[API Auth] ${url} - Token invalid/expired`);
    } else {
      console.error(`[API Error] ${url}`, error);
    }
    throw error;
  }
}

export const api = {
  get: (endpoint: string, token?: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return apiRequest(endpoint, { method: 'GET', headers });
  },

  post: (endpoint: string, body: any, token?: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return apiRequest(endpoint, { method: 'POST', headers, body });
  },

  patch: (endpoint: string, body: any, token?: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return apiRequest(endpoint, { method: 'PATCH', headers, body });
  },

  delete: (endpoint: string, token?: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return apiRequest(endpoint, { method: 'DELETE', headers });
  },

  put: (endpoint: string, body: any, token?: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return apiRequest(endpoint, { method: 'PUT', headers, body });
  },
};
