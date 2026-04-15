import axios from 'axios';
import { API_BASE_URL, API_DEBUG_INFO, buildApiUrl, reportApiConfiguration } from './base';
import { useAuthStore } from '../store/authStore';

const isProduction = process.env.NODE_ENV === 'production';

const resolveRequestUrl = (config = {}) => {
  const url = config.url || '';

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const baseUrl = (config.baseURL || API_BASE_URL || '').replace(/\/+$/, '');
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${normalizedPath}`;
};

const client = axios.create({ baseURL: API_BASE_URL, withCredentials: false });

reportApiConfiguration();

client.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (isProduction && config.url === '/auth/login' && typeof console !== 'undefined') {
    console.info('[Taskara] Login request target', {
      requestUrl: resolveRequestUrl(config),
      apiBaseUrl: API_DEBUG_INFO.apiBaseUrl,
    });
  }

  return config;
});

let refreshing = false;
let queue = [];

client.interceptors.response.use(
  res => res,
  async err => {
    const orig = err.config;

    if (isProduction && orig?.url === '/auth/login' && typeof console !== 'undefined') {
      console.error('[Taskara] Login request failed', {
        requestUrl: resolveRequestUrl(orig),
        apiBaseUrl: API_DEBUG_INFO.apiBaseUrl,
        browserOrigin: API_DEBUG_INFO.browserOrigin,
        status: err.response?.status ?? null,
        code: err.code ?? null,
        message: err.message,
      });
    }

    if (err.response?.status === 401 && !orig._retry) {
      if (refreshing) return new Promise((res, rej) => queue.push({ res, rej })).then(() => client(orig));
      orig._retry = true;
      refreshing = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(buildApiUrl('/auth/refresh'), { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        useAuthStore.setState((state) => ({
          ...state,
          token: data.accessToken,
          refreshToken: data.refreshToken,
        }));
        queue.forEach(q => q.res());
        queue = [];
        return client(orig);
      } catch (e) {
        queue.forEach(q => q.rej(e));
        queue = [];
        localStorage.clear();
        useAuthStore.setState({ user: null, token: null, refreshToken: null });
        window.location.href = '/login';
      } finally { refreshing = false; }
    }
    return Promise.reject(err);
  }
);

export default client;
