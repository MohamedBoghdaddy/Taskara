const IntegrationSettings = require("../../models/IntegrationSettings");
const ExecutionItem = require("../../models/ExecutionItem");
const { getTemplate } = require("./helpers");

const SYSTEM_OF_RECORD_ONLY = new Set(["ats", "crm", "google_drive", "notion", "clickup"]);

const getConnectedProviders = async (workspaceId) => {
  const docs = await IntegrationSettings.find({ workspaceId, isActive: true }).select("provider");
  const providers = {};
  for (const doc of docs) providers[doc.provider] = true;
  return providers;
};

const buildIntegrationCoverage = async (workspaceId, audienceType) => {
  const template = getTemplate(audienceType);
  const connectedProviders = await getConnectedProviders(workspaceId);
  return (template?.syncTargets || []).map((provider) => ({
    provider,
    connected: Boolean(connectedProviders[provider]),
    writeMode: SYSTEM_OF_RECORD_ONLY.has(provider) ? "protected" : "direct",
    status: connectedProviders[provider]
      ? SYSTEM_OF_RECORD_ONLY.has(provider)
        ? "connected_needs_mapping"
        : "connected"
      : "not_connected",
  }));
};

const recordSyncResult = async ({ itemId, provider, status, details = {}, direction = "outbound" }) => {
  await ExecutionItem.updateOne(
    { _id: itemId },
    {
      $push: {
        syncLogs: {
          provider,
          status,
          direction,
          attemptedAt: new Date(),
          details,
        },
        auditTrail: {
          at: new Date(),
          type: "synced",
          actorType: "integration",
          message: `Sync ${status} for ${provider}.`,
          metadata: details,
        },
      },
    },
  );
};

const planProtectedSync = async ({ itemId, provider, reason }) =>
  recordSyncResult({
    itemId,
    provider,
    status: "awaiting_connector",
    details: { reason },
  });

module.exports = {
  buildIntegrationCoverage,
  getConnectedProviders,
  planProtectedSync,
  recordSyncResult,
};
