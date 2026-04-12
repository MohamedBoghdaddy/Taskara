import client from './client';

export const getWebhooks    = ()       => client.get('/webhooks').then(r => r.data);
export const createWebhook  = (d)      => client.post('/webhooks', d).then(r => r.data);
export const updateWebhook  = (id, d)  => client.patch(`/webhooks/${id}`, d).then(r => r.data);
export const deleteWebhook  = (id)     => client.delete(`/webhooks/${id}`).then(r => r.data);
export const testWebhook    = (id)     => client.post(`/webhooks/${id}/test`).then(r => r.data);
export const getValidEvents = ()       => client.get('/webhooks/events').then(r => r.data);
