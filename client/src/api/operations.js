import client from "./client";

export const getOperationsOverview = () => client.get("/ops/overview").then((r) => r.data);
export const getOnboardingStatus = () => client.get("/ops/onboarding").then((r) => r.data);
export const selectOnboardingAudience = (audienceType) =>
  client.post("/ops/onboarding/select-audience", { audienceType }).then((r) => r.data);
export const runOnboardingDemo = (audienceType) =>
  client.post("/ops/onboarding/run-demo", { audienceType }).then((r) => r.data);
export const completeOnboarding = () => client.post("/ops/onboarding/complete").then((r) => r.data);
export const runWorkflowVerification = (audienceType) =>
  client.post(`/ops/workflow-tests/${audienceType}/run`).then((r) => r.data);
export const runConnectorVerification = (provider) =>
  client.post(`/ops/connectors/${provider}/test`).then((r) => r.data);
