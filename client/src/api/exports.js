import client from './client';

const downloadCSV = async (url, filename) => {
  const res = await client.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = href; a.download = filename; a.click();
  URL.revokeObjectURL(href);
};

export const exportTasks     = (params = {}) => downloadCSV(`/exports/tasks?${new URLSearchParams(params)}`, 'tasks.csv');
export const exportAnalytics = (days = 30)   => downloadCSV(`/exports/analytics?days=${days}`, 'analytics.csv');
export const exportBoards    = ()             => downloadCSV('/exports/boards', 'boards.csv');
