import client from './client';

export const getSprints     = (p)     => client.get('/sprints', { params: p }).then(r => r.data);
export const createSprint   = (d)     => client.post('/sprints', d).then(r => r.data);
export const getSprint      = (id)    => client.get(`/sprints/${id}`).then(r => r.data);
export const updateSprint   = (id, d) => client.patch(`/sprints/${id}`, d).then(r => r.data);
export const deleteSprint   = (id)    => client.delete(`/sprints/${id}`).then(r => r.data);
export const getSprintStats = (id)    => client.get(`/sprints/${id}/stats`).then(r => r.data);
