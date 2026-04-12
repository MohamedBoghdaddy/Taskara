import client from './client';

export const getAutomations    = ()      => client.get('/automations').then(r => r.data);
export const createAutomation  = (d)     => client.post('/automations', d).then(r => r.data);
export const updateAutomation  = (id, d) => client.patch(`/automations/${id}`, d).then(r => r.data);
export const deleteAutomation  = (id)    => client.delete(`/automations/${id}`).then(r => r.data);
export const toggleAutomation  = (id)    => client.post(`/automations/${id}/toggle`).then(r => r.data);
export const getTemplates      = ()      => client.get('/automations/meta/templates').then(r => r.data);
