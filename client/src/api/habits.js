import client from './client';

export const getHabitHistory = (days = 30) => client.get('/habits', { params: { days } }).then(r => r.data);
export const getStreak       = ()           => client.get('/habits/streak').then(r => r.data);
export const recordHabit     = ()           => client.post('/habits/record').then(r => r.data);
export const getFocusScore   = ()           => client.get('/analytics/focus-score').then(r => r.data);
export const getBurnout      = ()           => client.get('/analytics/burnout').then(r => r.data);
export const getWeeklyTrend  = ()           => client.get('/analytics/weekly-trend').then(r => r.data);
export const getAnalyticsHabits = (days) => client.get('/analytics/habits', { params: { days } }).then(r => r.data);
