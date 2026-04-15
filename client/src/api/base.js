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

export const API_DEBUG_INFO = {
  nodeEnv: process.env.NODE_ENV,
  apiBaseUrl: API_BASE_URL,
  apiOrigin: API_ORIGIN,
  socketUrl: SOCKET_URL,
  browserOrigin: isBrowser ? trimTrailingSlash(window.location.origin) : null,
  envApiBaseUrl: envApiBaseUrl || null,
  envServerOrigin: envServerOrigin || null,
  envSocketUrl: envSocketUrl || null,
};

let hasReportedApiConfiguration = false;

if (isProduction && !envApiBaseUrl && typeof console !== 'undefined') {
  console.warn('[Taskara] REACT_APP_API_URL is missing in production; falling back to same-origin /api.');
}

export const reportApiConfiguration = () => {
  if (!isBrowser) return;

  window.__TASKARA_API_DEBUG__ = API_DEBUG_INFO;

  if (hasReportedApiConfiguration) return;
  hasReportedApiConfiguration = true;

  if (isProduction && typeof console !== 'undefined') {
    console.info('[Taskara] Runtime API config', API_DEBUG_INFO);
  }
};

export const buildApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const buildServerUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_ORIGIN}${normalizedPath}`;
};
