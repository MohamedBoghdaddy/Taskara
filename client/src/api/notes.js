import client from './client';
export const getNotes = p => client.get('/notes', { params: p }).then(r => r.data);
export const createNote = d => client.post('/notes', d).then(r => r.data);
export const getNote = id => client.get(`/notes/${id}`).then(r => r.data);
export const updateNote = (id, d) => client.patch(`/notes/${id}`, d).then(r => r.data);
export const deleteNote = id => client.delete(`/notes/${id}`).then(r => r.data);
export const getBacklinks = id => client.get(`/notes/${id}/backlinks`).then(r => r.data);
export const getDailyNote = date => client.get(`/daily-notes/${date}`).then(r => r.data);
export const generateDailyNote = date => client.post(`/daily-notes/${date}/generate`).then(r => r.data);
