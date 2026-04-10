import client from './client';
export const getInbox = p => client.get('/inbox', { params: p }).then(r => r.data);
export const createInboxItem = d => client.post('/inbox', d).then(r => r.data);
export const updateInboxItem = (id, d) => client.patch(`/inbox/${id}`, d).then(r => r.data);
export const convertInboxItem = (id, d) => client.post(`/inbox/${id}/convert`, d).then(r => r.data);
