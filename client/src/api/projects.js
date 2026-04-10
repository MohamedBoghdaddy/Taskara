import client from './client';
export const getProjects = p => client.get('/projects', { params: p }).then(r => r.data);
export const createProject = d => client.post('/projects', d).then(r => r.data);
export const getProject = id => client.get(`/projects/${id}`).then(r => r.data);
export const updateProject = (id, d) => client.patch(`/projects/${id}`, d).then(r => r.data);
