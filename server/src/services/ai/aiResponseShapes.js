const VALID_TONES = new Set(['neutral', 'success', 'warning', 'danger', 'info', 'trust']);

const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asArray = (value) => (Array.isArray(value) ? value.filter((entry) => entry !== null && entry !== undefined) : []);
const asText = (value, fallback = '') => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
};
const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const clampConfidence = (value, fallback = 0) => Math.max(0, Math.min(100, Math.round(asNumber(value, fallback))));
const normalizeTone = (value, fallback = 'info') => (VALID_TONES.has(value) ? value : fallback);

const normalizeSource = (value, index) => {
  if (typeof value === 'string') {
    return { label: value };
  }

  const source = asObject(value);
  const normalized = {
    label: asText(source.label || source.title, `Source ${index + 1}`),
  };

  if (source.count !== undefined && source.count !== null && Number.isFinite(Number(source.count))) {
    normalized.count = Math.max(0, Number(source.count));
  }

  return normalized;
};

const normalizeStructuredItem = (value, index, fallbackPrefix = 'item') => {
  if (typeof value === 'string') {
    return {
      id: `${fallbackPrefix}-${index}`,
      label: value,
      description: '',
      state: '',
      tone: 'info',
      requiresApproval: false,
    };
  }

  const item = asObject(value);
  return {
    id: asText(item.id, `${fallbackPrefix}-${index}`),
    label: asText(item.label || item.title || item.headline, `Untitled ${fallbackPrefix}`),
    description: asText(item.description || item.reason || item.meta),
    state: asText(item.state),
    tone: normalizeTone(asText(item.tone), 'info'),
    requiresApproval: Boolean(item.requiresApproval),
    route: asText(item.route) || null,
  };
};

const normalizePrediction = (value) => {
  const prediction = asObject(value);
  if (!Object.keys(prediction).length) return null;

  return {
    headline: asText(prediction.headline, 'Signal unavailable'),
    confidence: clampConfidence(prediction.confidence, 0),
    reasoning: asText(prediction.reasoning, 'No reasoning was returned.'),
    factors: asArray(prediction.factors)
      .map((factor, index) => asText(factor, `Factor ${index + 1}`))
      .filter(Boolean),
  };
};

const normalizeExecutionPreview = (value) => {
  const preview = asObject(value);
  return {
    status: asText(preview.status, 'preview'),
    safeToAutoRun: Boolean(preview.safeToAutoRun),
    requiresApproval: Boolean(preview.requiresApproval),
    approvalReason: asText(preview.approvalReason),
    suggestedRoute: asText(preview.suggestedRoute) || null,
    acceptedAliases: asArray(preview.acceptedAliases)
      .map((entry, index) => asText(entry, `Suggestion ${index + 1}`))
      .filter(Boolean),
  };
};

const normalizeWorkspaceAnswerResponse = (value, { question = '' } = {}) => {
  const response = asObject(value);

  return {
    question: asText(response.question, question),
    answer: asText(response.answer, 'No answer was returned.'),
    confidence: clampConfidence(response.confidence, 0),
    sources: asArray(response.sources).map((entry, index) => {
      const source = asObject(entry);
      return {
        noteId: asText(source.noteId) || null,
        title: asText(source.title, `Source ${index + 1}`),
        relevance: Math.max(0, asNumber(source.relevance, 0)),
      };
    }),
    aiGenerated: response.aiGenerated !== false,
  };
};

const normalizePlanTodayResponse = (value) => {
  const response = asObject(value);

  return {
    plan: asText(response.plan, 'No execution plan was returned.'),
    summary: asText(response.summary, 'No summary was returned.'),
    priorities: asArray(response.priorities).map((entry, index) => {
      const item = asObject(entry);
      return {
        title: asText(item.title, `Priority ${index + 1}`),
        reason: asText(item.reason, 'No reason provided.'),
        priority: asText(item.priority, 'medium'),
        dueDate: item.dueDate || null,
      };
    }),
    schedule: asArray(response.schedule).map((entry, index) => {
      const item = asObject(entry);
      return {
        slot: asText(item.slot, `Step ${index + 1}`),
        title: asText(item.title, `Planned item ${index + 1}`),
        focus: asText(item.focus, 'Focus block'),
      };
    }),
    risks: asArray(response.risks).map((entry, index) => {
      const item = asObject(entry);
      return {
        title: asText(item.title, `Risk ${index + 1}`),
        risk: asText(item.risk, 'No explicit risk was returned.'),
      };
    }),
    confidence: clampConfidence(response.confidence, 0),
    aiGenerated: response.aiGenerated !== false,
  };
};

const normalizeWorkspaceSummaryResponse = (value, { vertical = 'core', surfaceMode = 'operator' } = {}) => {
  const response = asObject(value);

  return {
    vertical: asText(response.vertical, vertical),
    surfaceMode: asText(response.surfaceMode, surfaceMode === 'student' ? 'student' : 'operator'),
    headline: asText(response.headline, 'Workspace summary ready'),
    summary: asText(response.summary, 'No workspace summary was returned.'),
    confidence: clampConfidence(response.confidence, 0),
    sources: asArray(response.sources).map(normalizeSource),
    whatMattersNow: asArray(response.whatMattersNow).map((item, index) => normalizeStructuredItem(item, index, 'attention')),
    recommendations: asArray(response.recommendations).map((item, index) => normalizeStructuredItem(item, index, 'recommendation')),
    prediction: normalizePrediction(response.prediction),
    aiGenerated: response.aiGenerated !== false,
  };
};

const normalizeCommandCenterResponse = (value, { command = '', vertical = 'core', surfaceMode = 'operator' } = {}) => {
  const response = asObject(value);

  return {
    command: asText(response.command, command),
    vertical: asText(response.vertical, vertical),
    surfaceMode: asText(response.surfaceMode, surfaceMode === 'student' ? 'student' : 'operator'),
    intent: asText(response.intent, 'workspace_request'),
    intentLabel: asText(response.intentLabel, 'Automation preview'),
    confidence: clampConfidence(response.confidence, 0),
    directAnswer: asText(response.directAnswer, 'No automation preview was returned.'),
    reasoning: asArray(response.reasoning)
      .map((entry, index) => asText(entry, `Reason ${index + 1}`))
      .filter(Boolean),
    proposedActions: asArray(response.proposedActions).map((item, index) => normalizeStructuredItem(item, index, 'action')),
    recommendations: asArray(response.recommendations).map((item, index) => normalizeStructuredItem(item, index, 'recommendation')),
    executionPreview: normalizeExecutionPreview(response.executionPreview),
    aiGenerated: response.aiGenerated !== false,
  };
};

module.exports = {
  asArray,
  asObject,
  asText,
  clampConfidence,
  normalizeCommandCenterResponse,
  normalizeExecutionPreview,
  normalizePlanTodayResponse,
  normalizeStructuredItem,
  normalizeWorkspaceAnswerResponse,
  normalizeWorkspaceSummaryResponse,
};
