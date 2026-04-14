import client from './client';
export const getActive              = ()  => client.get('/pomodoro/active').then(r => r.data);
export const getHistory             = p   => client.get('/pomodoro/history', { params: p }).then(r => r.data);
export const startSession           = d   => client.post('/pomodoro/start', d).then(r => r.data);
export const pauseSession          = (id) => client.post(`/pomodoro/${id}/pause`).then(r => r.data);
export const resumeSession         = (id) => client.post(`/pomodoro/${id}/resume`).then(r => r.data);
export const stopSession            = (id, d) => client.post(`/pomodoro/${id}/stop`, d).then(r => r.data);
export const getAdaptiveRecommendations = () => client.get('/pomodoro/adaptive').then(r => r.data);
export const getBestTimes           = ()  => client.get('/pomodoro/best-times').then(r => r.data);
