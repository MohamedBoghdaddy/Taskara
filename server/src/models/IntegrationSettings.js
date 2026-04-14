const mongoose = require('mongoose');

/**
 * Stores per-workspace integration credentials & config.
 * Credentials are user-supplied — never hardcoded env vars.
 * One document per (workspaceId, provider) pair.
 */
const integrationSettingsSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    connectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: String,
      enum: ['github', 'google_calendar', 'notion', 'whatsapp', 'clickup'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    lastSyncAt: { type: Date, default: null },
    lastError: { type: String, default: null },

    // ── GitHub ────────────────────────────────────────────────────────────────
    github: {
      accessToken: String,          // Personal Access Token
      username: String,             // GitHub username / org
      repos: [{ owner: String, repo: String }], // repos to sync
      syncDirection: { type: String, enum: ['import', 'export', 'both'], default: 'import' },
    },

    // ── Google Calendar ───────────────────────────────────────────────────────
    googleCalendar: {
      accessToken: String,          // OAuth2 access token
      refreshToken: String,         // OAuth2 refresh token
      clientId: String,             // User's Google Cloud project client ID
      clientSecret: String,         // User's Google Cloud project client secret
      calendarId: { type: String, default: 'primary' },
      syncDirection: { type: String, enum: ['push', 'pull', 'both'], default: 'push' },
    },

    // ── Notion ────────────────────────────────────────────────────────────────
    notion: {
      apiToken: String,             // Internal Integration Token
      defaultDatabaseId: String,   // Notion DB to import from
      workspaceName: String,        // display name fetched on connect
    },

    // ── WhatsApp (Meta Business API) ─────────────────────────────────────────
    whatsapp: {
      accessToken: String,          // System User or Page Access Token
      phoneNumberId: String,        // WhatsApp Business Phone Number ID
      businessAccountId: String,
      webhookVerifyToken: String,   // User-defined token for webhook verification
    },

    // ── ClickUp ───────────────────────────────────────────────────────────────
    clickup: {
      apiKey: String,               // ClickUp Personal API Token
      teamId: String,               // ClickUp Workspace/Team ID
      listId: String,               // Default ClickUp list to sync
      teamName: String,             // display name fetched on connect
    },
  },
  { timestamps: true }
);

// Unique constraint: one settings doc per workspace+provider
integrationSettingsSchema.index({ workspaceId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model('IntegrationSettings', integrationSettingsSchema);
