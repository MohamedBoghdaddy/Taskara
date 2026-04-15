const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const DEV_API_ORIGIN = 'http://localhost:5000';

const envApiBaseUrl = trimTrailingSlash(process.env.REACT_APP_API_URL || '');

export const API_BASE_URL = envApiBaseUrl || `${DEV_API_ORIGIN}/api`;
export const API_ORIGIN = trimTrailingSlash(process.env.REACT_APP_SERVER_URL || '')
  || API_BASE_URL.replace(/\/api$/, '');
export const SOCKET_URL = trimTrailingSlash(process.env.REACT_APP_SOCKET_URL || '')
  || API_ORIGIN;

export const buildApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const buildServerUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_ORIGIN}${normalizedPath}`;
};
