import client from './client';
export const register = d => client.post('/auth/register', d).then(r => r.data);
export const login = d => client.post('/auth/login', d).then(r => r.data);
export const logout = d => client.post('/auth/logout', d).then(r => r.data);
export const getMe = () => client.get('/auth/me').then(r => r.data);
export const updateProfile = d => client.patch('/auth/profile', d).then(r => r.data);
