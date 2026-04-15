const IntegrationSettings = require("../../models/IntegrationSettings");
const ExecutionItem = require("../../models/ExecutionItem");
const { getTemplate } = require("./helpers");

const SYSTEM_OF_RECORD_ONLY = new Set(["ats", "crm", "google_drive", "notion", "clickup"]);
const DIRECT_PROVIDER_DETAILS = {
  email: () => {
    const configured = process.env.NODE_ENV !== "production" || (process.env.EMAIL_HOST && process.env.EMAIL_PORT);
    return configured
      ? { connected: true, ready: true, status: "connected", details: ["Taskara can send email with the current server config."] }
      : { connected: false, ready: false, status: "not_connected", details: ["Email transport is not configured."] };
  },
  slack: (doc) => {
    if (!doc?.slack?.webhookUrl) {
      return { connected: false, ready: false, status: "not_connected", details: ["Slack webhook is missing."] };
    }
    return {
      connected: true,
      ready: true,
      status: doc.slack.defaultChannel ? "connected" : "connected_unlabeled_target",
      details: doc.slack.defaultChannel
        ? [`Default Slack target: ${doc.slack.defaultChannel}`]
        : ["Slack webhook is connected but no default channel label is saved."],
    };
  },
  github: (doc) => {
    if (!doc?.github?.accessToken) {
      return { connected: false, ready: false, status: "not_connected", details: ["GitHub access token is missing."] };
    }
    const repo = doc.github.repos?.[0];
    if (!["export", "both"].includes(doc.github.syncDirection || "import")) {
      return {
        connected: true,
        ready: false,
        status: "connected_import_only",
        details: ["GitHub is connected but export sync is disabled for this workspace."],
      };
    }
    return repo
      ? {
          connected: true,
          ready: true,
          status: "connected",
          details: [`Primary repo mapping: ${repo.owner}/${repo.repo}`],
        }
      : {
          connected: true,
          ready: false,
          status: "connected_needs_repo_mapping",
          details: ["GitHub is connected but no repo mapping has been selected."],
        };
  },
  google_calendar: (doc) => {
    if (!doc?.googleCalendar) {
      return {
        connected: false,
        ready: false,
        status: "not_connected",
        details: ["Google Calendar credentials are missing."],
      };
    }
    const hasCredentials =
      doc.googleCalendar.accessToken ||
      (doc.googleCalendar.refreshToken && doc.googleCalendar.clientId && doc.googleCalendar.clientSecret);
    if (!hasCredentials) {
      return {
        connected: true,
        ready: false,
        status: "connected_needs_credentials_refresh",
        details: ["Google Calendar needs valid access or refresh credentials."],
      };
    }
    if (!["push", "both"].includes(doc.googleCalendar.syncDirection || "push")) {
      return {
        connected: true,
        ready: false,
        status: "connected_pull_only",
        details: ["Google Calendar is connected but push sync is disabled for this workspace."],
      };
    }
    return {
      connected: true,
      ready: true,
      status: doc.googleCalendar.calendarId ? "connected" : "connected_needs_calendar_mapping",
      details: [`Calendar target: ${doc.googleCalendar.calendarId || "primary"}`],
    };
  },
  notion: (doc) => {
    if (!doc?.notion?.apiToken) {
      return { connected: false, ready: false, status: "not_connected", details: ["Notion API token is missing."] };
    }
    return {
      connected: true,
      ready: Boolean(doc.notion.defaultDatabaseId),
      status: doc.notion.defaultDatabaseId ? "connected" : "connected_needs_database_mapping",
      details: doc.notion.defaultDatabaseId
        ? [`Default database: ${doc.notion.defaultDatabaseId}`]
        : ["Notion is connected but no target database is mapped."],
    };
  },
  clickup: (doc) => {
    if (!doc?.clickup?.apiKey) {
      return { connected: false, ready: false, status: "not_connected", details: ["ClickUp API key is missing."] };
    }
    return {
      connected: true,
      ready: Boolean(doc.clickup.listId),
      status: doc.clickup.listId ? "connected" : "connected_needs_list_mapping",
      details: doc.clickup.listId
        ? [`Default list: ${doc.clickup.listId}`]
        : ["ClickUp is connected but no target list is mapped."],
    };
  },
  whatsapp: (doc) => {
    if (!doc?.whatsapp?.accessToken || !doc?.whatsapp?.phoneNumberId) {
      return {
        connected: false,
        ready: false,
        status: "not_connected",
        details: ["WhatsApp access token or phone number ID is missing."],
      };
    }
    return {
      connected: true,
      ready: true,
      status: "connected",
      details: [`Phone number ID: ${doc.whatsapp.phoneNumberId}`],
    };
  },
};
const PROTECTED_PROVIDER_DETAILS = {
  ats: {
    connected: false,
    ready: false,
    status: "mapping_required",
    details: ["ATS sync remains protected until stage, owner, and activity mappings are configured."],
  },
  crm: {
    connected: false,
    ready: false,
    status: "mapping_required",
    details: ["CRM sync remains protected until milestone, owner, and record mappings are configured."],
  },
  google_drive: {
    connected: false,
    ready: false,
    status: "mapping_required",
    details: ["Drive storage sync needs a document destination mapping."],
  },
};

const getConnectedProviders = async (workspaceId) => {
  const docs = await IntegrationSettings.find({ workspaceId, isActive: true });
  const providers = {};
  for (const doc of docs) providers[doc.provider] = true;
  return { flags: providers, docs };
};

const findProviderDoc = (docs, provider) => docs.find((doc) => doc.provider === provider) || null;

const validateProviderMapping = async (workspaceId, provider, options = {}) => {
  const docs = options.docs || (await getConnectedProviders(workspaceId)).docs;
  if (DIRECT_PROVIDER_DETAILS[provider]) {
    const mapping = DIRECT_PROVIDER_DETAILS[provider](findProviderDoc(docs, provider));
    return { provider, ...mapping };
  }
  if (PROTECTED_PROVIDER_DETAILS[provider]) {
    return { provider, ...PROTECTED_PROVIDER_DETAILS[provider] };
  }
  return {
    provider,
    connected: false,
    ready: false,
    status: "not_connected",
    details: [`${provider} is not configured for this workspace.`],
  };
};

const buildIntegrationCoverage = async (workspaceId, audienceType) => {
  const template = getTemplate(audienceType);
  const { docs } = await getConnectedProviders(workspaceId);
  return Promise.all(
    (template?.syncTargets || []).map(async (provider) => {
      const mapping = await validateProviderMapping(workspaceId, provider, { docs });
      return {
        provider,
        connected: Boolean(mapping.connected),
        ready: Boolean(mapping.ready),
        writeMode: SYSTEM_OF_RECORD_ONLY.has(provider) ? "protected" : "direct",
        status: mapping.status,
        details: mapping.details,
      };
    }),
  );
};

const recordSyncResult = async ({ itemId, provider, status, details = {}, direction = "outbound" }) => {
  const attemptedAt = new Date();
  await ExecutionItem.updateOne(
    { _id: itemId },
    {
      $push: {
        syncLogs: {
          provider,
          status,
          direction,
          attemptedAt,
          details,
        },
        auditTrail: {
          at: attemptedAt,
          type: "synced",
          actorType: "integration",
          message: `Sync ${status} for ${provider}.`,
          metadata: details,
        },
      },
    },
  );

  if (SYSTEM_OF_RECORD_ONLY.has(provider)) return;

  const message = details.reason || details.error || null;
  const itemDoc = await ExecutionItem.findById(itemId).select("workspaceId");
  if (!itemDoc?.workspaceId) return;

  const set = {};
  if (status === "synced") {
    set.lastSyncAt = attemptedAt;
    set.lastError = null;
  } else if (message) {
    set.lastError = message;
  }

  if (!Object.keys(set).length) return;

  await IntegrationSettings.updateOne(
    { provider, workspaceId: itemDoc.workspaceId },
    { $set: set },
  ).catch(() => {});
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
  validateProviderMapping,
};
