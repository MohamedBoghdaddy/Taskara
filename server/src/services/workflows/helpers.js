const crypto = require("crypto");
const { getTemplate, getWorkflowType, normalizeAudienceKey } = require("../../config/workflowTemplates");

const ACTIVE_ITEM_STATUSES = ["queued", "ready", "awaiting_approval", "scheduled", "in_progress", "blocked"];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const summarizeText = (text, maxLength = 220) => {
  if (!text) return "";
  const cleaned = String(text).replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1)}...`;
};

const makeFingerprint = ({ audienceType, workflowType, sourceType, sourceRef = {}, text = "", title = "" }) => {
  const fingerprintInput = [
    normalizeAudienceKey(audienceType),
    workflowType || "",
    sourceType || "",
    sourceRef.externalId || "",
    sourceRef.threadId || "",
    sourceRef.url || "",
    title || "",
    summarizeText(text, 400),
  ].join("|");

  return crypto.createHash("sha1").update(fingerprintInput).digest("hex");
};

const inferPriority = (text = "") => {
  const normalized = String(text).toLowerCase();
  if (/(urgent|asap|critical|today|immediately|now)/.test(normalized)) return "urgent";
  if (/(high priority|important|priority|blocking|stalled)/.test(normalized)) return "high";
  if (/(low priority|whenever|nice to have)/.test(normalized)) return "low";
  return "medium";
};

const inferDueAt = (text = "") => {
  const normalized = String(text).toLowerCase();
  const now = new Date();
  if (/\btoday\b/.test(normalized)) return addDays(now, 0);
  if (/\btomorrow\b/.test(normalized)) return addDays(now, 1);
  if (/\bthis week\b/.test(normalized)) return addDays(now, 5);
  if (/\bnext week\b/.test(normalized)) return addDays(now, 7);
  if (/\binterview\b|\bshowing\b|\bclosing\b/.test(normalized)) return addDays(now, 2);
  return null;
};

const parseSegments = (text = "", fallbackTitle = "Untitled workflow item") => {
  const lines = String(text)
    .split(/\n+/)
    .map((line) => line.replace(/^[\-\*\d\.\)\s]+/, "").trim())
    .filter((line) => line.length >= 4);

  if (lines.length >= 2) return lines.slice(0, 6);

  const sentences = String(text)
    .split(/[.!?]+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 8);

  if (sentences.length) return sentences.slice(0, 4);
  return [fallbackTitle];
};

const inferWorkflowType = (audienceType, text = "", payload = {}) => {
  const normalizedAudience = normalizeAudienceKey(audienceType);
  const template = getTemplate(normalizedAudience);
  const normalized = `${text} ${JSON.stringify(payload || {})}`.toLowerCase();
  if (!template) return "";

  const matchers = {
    recruiters: [
      { type: "interview_coordination", test: /\binterview\b|\bschedule\b|\bavailability\b/ },
      { type: "candidate_rejection", test: /\breject\b|\brejection\b|\bnurture\b/ },
      { type: "candidate_outreach", test: /.*/ },
    ],
    startups: [
      { type: "issue_routing", test: /\bbug\b|\bincident\b|\bissue\b|\btriage\b/ },
      { type: "spec_handoff", test: /\bspec\b|\bhandoff\b|\bengineering\b|\bpr\b|\brelease\b/ },
      { type: "thread_breakdown", test: /.*/ },
    ],
    agencies: [
      { type: "revision_loop", test: /\brevision\b|\bfeedback\b|\bchanges\b/ },
      { type: "approval_chase", test: /\bapprove\b|\bapproval\b|\bsign[- ]?off\b/ },
      { type: "brief_to_deliverables", test: /.*/ },
    ],
    realestate: [
      { type: "document_chase", test: /\bdocument\b|\bdocs\b|\bcontract\b|\bpaperwork\b/ },
      { type: "milestone_update", test: /\bclosing\b|\bmilestone\b|\bstage\b|\bcontract\b/ },
      { type: "lead_followup", test: /.*/ },
    ],
  };

  const matched = (matchers[normalizedAudience] || []).find((item) => item.test.test(normalized));
  return matched?.type || Object.keys(template.workflowTypes)[0];
};

const buildExecutionPlan = (template, workflowTypeKey) => {
  const workflowConfig = getWorkflowType(template.key, workflowTypeKey);
  if (!template || !workflowConfig) return [];

  const immediateSteps = [];
  const delayedSteps = [];

  for (const actionId of workflowConfig.actions || []) {
    const action = template.actionCatalog[actionId];
    if (!action) continue;

    const cadenceConfig = (template.followUpCadence || []).find((entry) => entry.actionId === actionId);
    const isDelayed = Boolean(cadenceConfig && actionId !== workflowConfig.actions[0]);
    const step = {
      id: actionId,
      label: action.label,
      channel: action.channel,
      requiresApproval: Boolean(action.requiresApproval),
      status: isDelayed ? "waiting" : "pending",
      scheduledFor: isDelayed ? addDays(new Date(), cadenceConfig.delayDays || 0) : null,
      metadata: {
        risky: Boolean(action.risky),
        cadenceDelayDays: cadenceConfig?.delayDays ?? null,
      },
    };

    if (isDelayed) delayedSteps.push(step);
    else immediateSteps.push(step);
  }

  return [...immediateSteps, ...delayedSteps];
};

const calculateRiskLevel = (template, workflowTypeKey) => {
  const workflowConfig = getWorkflowType(template.key, workflowTypeKey);
  const riskyActionCount = (workflowConfig?.actions || []).filter(
    (actionId) => template.actionCatalog[actionId]?.risky,
  ).length;

  if (riskyActionCount >= 2) return "high";
  if (riskyActionCount === 1) return "medium";
  return "low";
};

const buildAuditEntry = (type, message, metadata = {}, actorType = "system", actorId = null) => ({
  at: new Date(),
  type,
  actorType,
  actorId,
  message,
  metadata,
});

module.exports = {
  ACTIVE_ITEM_STATUSES,
  addDays,
  buildAuditEntry,
  buildExecutionPlan,
  calculateRiskLevel,
  clamp,
  getTemplate,
  getWorkflowType,
  inferDueAt,
  inferPriority,
  inferWorkflowType,
  makeFingerprint,
  normalizeAudienceKey,
  parseSegments,
  summarizeText,
};
