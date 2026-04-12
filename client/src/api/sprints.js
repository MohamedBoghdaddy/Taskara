import client from './client';

export const getSprints          = (p)          => client.get('/sprints', { params: p }).then(r => r.data);
export const createSprint        = (d)          => client.post('/sprints', d).then(r => r.data);
export const getSprint           = (id)         => client.get(`/sprints/${id}`).then(r => r.data);
export const updateSprint        = (id, d)      => client.patch(`/sprints/${id}`, d).then(r => r.data);
export const deleteSprint        = (id)         => client.delete(`/sprints/${id}`).then(r => r.data);
export const getSprintStats      = (id)         => client.get(`/sprints/${id}/stats`).then(r => r.data);
export const addTaskToSprint     = (id, taskId) => client.patch(`/tasks/${taskId}`, { sprintId: id }).then(r => r.data);
export const removeTaskFromSprint= (id, taskId) => client.patch(`/tasks/${taskId}`, { sprintId: null }).then(r => r.data);
export const updateSprintTask    = (taskId, d)  => client.patch(`/tasks/${taskId}`, d).then(r => r.data);
export const getBacklogTasks     = (p)          => client.get('/tasks', { params: { ...p, sprintId: 'none', status: 'todo,in_progress,blocked' } }).then(r => r.data);
