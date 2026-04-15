import axios from 'axios';
import { API_BASE_URL, buildApiUrl } from './base';

const client = axios.create({ baseURL: API_BASE_URL, withCredentials: false });

client.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
let queue = [];

client.interceptors.response.use(
  res => res,
  async err => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      if (refreshing) return new Promise((res, rej) => queue.push({ res, rej })).then(() => client(orig));
      orig._retry = true;
      refreshing = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(buildApiUrl('/auth/refresh'), { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        queue.forEach(q => q.res());
        queue = [];
        return client(orig);
      } catch (e) {
        queue.forEach(q => q.rej(e));
        queue = [];
        localStorage.clear();
        window.location.href = '/login';
      } finally { refreshing = false; }
    }
    return Promise.reject(err);
  }
);

export default client;
