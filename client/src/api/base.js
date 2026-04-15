const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const DEV_API_ORIGIN = 'http://localhost:5000';
const isBrowser = typeof window !== 'undefined';
const isProduction = process.env.NODE_ENV === 'production';

const envApiBaseUrl = trimTrailingSlash(process.env.REACT_APP_API_URL || '');
const envServerOrigin = trimTrailingSlash(process.env.REACT_APP_SERVER_URL || '');
const envSocketUrl = trimTrailingSlash(process.env.REACT_APP_SOCKET_URL || '');

const productionOrigin = isBrowser ? trimTrailingSlash(window.location.origin) : '';
const productionApiBase = productionOrigin ? `${productionOrigin}/api` : '/api';

export const API_BASE_URL = envApiBaseUrl
  || (isProduction ? productionApiBase : `${DEV_API_ORIGIN}/api`);
export const API_ORIGIN = envServerOrigin
  || (isProduction ? productionOrigin : DEV_API_ORIGIN)
  || API_BASE_URL.replace(/\/api$/, '');
export const SOCKET_URL = envSocketUrl
  || API_ORIGIN;

if (isProduction && !envApiBaseUrl && typeof console !== 'undefined') {
  console.warn('[Taskara] REACT_APP_API_URL is missing in production; falling back to same-origin /api.');
}

export const buildApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const buildServerUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_ORIGIN}${normalizedPath}`;
};
