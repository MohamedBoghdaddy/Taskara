import client from './client';
export const getTasks = p => client.get('/tasks', { params: p }).then(r => r.data);
export const getTodayTasks = () => client.get('/tasks/today').then(r => r.data);
export const createTask = d => client.post('/tasks', d).then(r => r.data);
export const getTask = id => client.get(`/tasks/${id}`).then(r => r.data);
export const updateTask = (id, d) => client.patch(`/tasks/${id}`, d).then(r => r.data);
export const deleteTask = id => client.delete(`/tasks/${id}`).then(r => r.data);
