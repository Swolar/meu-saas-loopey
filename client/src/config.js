const isDev = import.meta.env.DEV;
const API_URL = import.meta.env.VITE_API_URL || (isDev ? 'http://localhost:3001' : '');

export const getApiUrl = (endpoint) => {
  // If API_URL is empty, we return the endpoint directly (relative path)
  if (!API_URL) {
      return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }

  // Remove trailing slash from API_URL if exists
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  // Ensure endpoint starts with slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('loopey_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const authFetch = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    // Optional: trigger logout if token is invalid
    // window.dispatchEvent(new Event('auth:logout'));
  }
  
  return response;
};

export const SOCKET_URL = API_URL || window.location.origin;
