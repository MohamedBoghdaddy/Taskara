import client from './client';

export const getAgencyDashboard = () => client.get('/agencies/dashboard').then((r) => r.data);
export const getAgencyClients = () => client.get('/agencies/clients').then((r) => r.data);
export const createAgencyClient = (data) => client.post('/agencies/clients', data).then((r) => r.data);
export const updateAgencyClient = (id, data) => client.patch(`/agencies/clients/${id}`, data).then((r) => r.data);
export const getAgencyCampaigns = () => client.get('/agencies/campaigns').then((r) => r.data);
export const createAgencyCampaign = (data) => client.post('/agencies/campaigns', data).then((r) => r.data);
export const updateAgencyCampaign = (id, data) => client.patch(`/agencies/campaigns/${id}`, data).then((r) => r.data);
export const getAgencyContent = () => client.get('/agencies/content').then((r) => r.data);
export const createAgencyContent = (data) => client.post('/agencies/content', data).then((r) => r.data);
export const updateAgencyContent = (id, data) => client.patch(`/agencies/content/${id}`, data).then((r) => r.data);
export const getAgencyReports = () => client.get('/agencies/reports').then((r) => r.data);
export const createAgencyReport = (data) => client.post('/agencies/reports', data).then((r) => r.data);
export const updateAgencyReport = (id, data) => client.patch(`/agencies/reports/${id}`, data).then((r) => r.data);
export const getAgencyRetainers = () => client.get('/agencies/retainers').then((r) => r.data);
export const createAgencyRetainer = (data) => client.post('/agencies/retainers', data).then((r) => r.data);
export const getAgencyApprovals = () => client.get('/agencies/approvals').then((r) => r.data);
export const getAgencyAiSuggestions = (data) => client.post('/agencies/ai/suggestions', data).then((r) => r.data);
