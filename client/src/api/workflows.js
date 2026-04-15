import client from "./client";

export const getWorkflowTemplates = () => client.get("/workflows/templates").then((r) => r.data);
export const getPublicWorkflowTemplates = () => client.get("/workflows/templates/public").then((r) => r.data);
export const getWorkflowDashboard = (audienceType) =>
  client.get("/workflows/dashboard", { params: { audienceType } }).then((r) => r.data);
export const getWorkflowAnalytics = (audienceType) =>
  client.get("/workflows/analytics", { params: audienceType ? { audienceType } : undefined }).then((r) => r.data);
export const getWorkflowItems = (params) => client.get("/workflows/items", { params }).then((r) => r.data);
export const ingestWorkflowInput = (payload) => client.post("/workflows/ingest", payload).then((r) => r.data);
export const updateWorkflowItem = (id, payload) => client.patch(`/workflows/items/${id}`, payload).then((r) => r.data);
export const executeWorkflowItem = (id, force = false) =>
  client.post(`/workflows/items/${id}/execute`, { force }).then((r) => r.data);
export const approveWorkflowItem = (id, decision, comment = "") =>
  client.post(`/workflows/items/${id}/approve`, { decision, comment }).then((r) => r.data);
export const controlWorkflowItem = (id, action) =>
  client.post(`/workflows/items/${id}/control`, { action }).then((r) => r.data);
export const assignWorkflowItem = (id, assigneeId) =>
  client.post(`/workflows/items/${id}/assign`, { assigneeId }).then((r) => r.data);
export const getMigrationPreview = (payload) =>
  client.post("/workflows/migration/preview", payload).then((r) => r.data);
