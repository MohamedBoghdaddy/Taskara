const VALID_TONES = new Set(["neutral", "success", "warning", "danger", "info", "trust"]);

export const ensureArray = (value) => (Array.isArray(value) ? value.filter((entry) => entry !== null && entry !== undefined) : []);
export const ensureObject = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});
export const ensureText = (value, fallback = "") => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
};

export const ensureNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const clampConfidence = (value, fallback = 0) => Math.max(0, Math.min(100, Math.round(ensureNumber(value, fallback))));
export const truncateText = (value, maxLength = 140) => {
  const text = ensureText(value);
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
};

export const normalizeTone = (value, fallback = "info") => (VALID_TONES.has(value) ? value : fallback);

export const normalizeStructuredItem = (value, index, fallbackPrefix = "item") => {
  if (typeof value === "string") {
    return {
      id: `${fallbackPrefix}-${index}`,
      label: value,
      description: "",
      state: "",
      tone: "info",
      requiresApproval: false,
    };
  }

  const item = ensureObject(value);
  return {
    id: ensureText(item.id, `${fallbackPrefix}-${index}`),
    label: ensureText(item.label || item.title || item.headline, `Untitled ${fallbackPrefix}`),
    description: ensureText(item.description || item.reason || item.meta),
    state: ensureText(item.state),
    tone: normalizeTone(ensureText(item.tone), "info"),
    requiresApproval: Boolean(item.requiresApproval),
    route: ensureText(item.route) || null,
  };
};

export const normalizeSources = (sources = []) =>
  ensureArray(sources).map((source, index) => {
    if (typeof source === "string") return { label: source, title: source };

    const entry = ensureObject(source);
    const normalized = {
      label: ensureText(entry.label || entry.title, `Source ${index + 1}`),
    };

    normalized.title = ensureText(entry.title, normalized.label);

    if (entry.count !== undefined && entry.count !== null && Number.isFinite(Number(entry.count))) {
      normalized.count = Math.max(0, Number(entry.count));
    }

    if (entry.noteId) normalized.noteId = ensureText(entry.noteId) || null;
    if (entry.relevance !== undefined) normalized.relevance = Math.max(0, ensureNumber(entry.relevance, 0));

    return normalized;
  });

export const normalizePrediction = (prediction) => {
  const entry = ensureObject(prediction);
  if (!Object.keys(entry).length) return null;

  return {
    headline: ensureText(entry.headline, "Signal unavailable"),
    confidence: clampConfidence(entry.confidence, 0),
    reasoning: ensureText(entry.reasoning, "No reasoning was returned."),
    factors: ensureArray(entry.factors)
      .map((factor, index) => ensureText(factor, `Factor ${index + 1}`))
      .filter(Boolean),
  };
};

export const groupSearchResults = (results = []) =>
  ensureArray(results).reduce((groups, entry, index) => {
    const item = ensureObject(entry);
    const type = ensureText(item.type, "other");
    if (!groups[type]) groups[type] = [];

    groups[type].push({
      type,
      score: ensureNumber(item.score, 0),
      item: ensureObject(item.item),
      fallbackId: `${type}-${index}`,
    });
    return groups;
  }, {});

export const getSearchResultRoute = (entry) => {
  const item = ensureObject(entry);
  const payload = ensureObject(item.item);

  if (item.type === "page") return ensureText(payload.path) || null;
  if (item.type === "note" && payload._id) return `/notes/${payload._id}`;
  if (item.type === "project" && payload._id) return `/projects/${payload._id}`;
  if (item.type === "task") return "/tasks";
  return null;
};

export const normalizeAskResult = (question, response) => ({
  type: "ask",
  question: ensureText(question, "Workspace question"),
  answer: ensureText(response?.answer, "No answer was returned."),
  confidence: clampConfidence(response?.confidence, 0),
  sources: normalizeSources(response?.sources),
});

export const normalizePlanResult = (question, response) => ({
  type: "plan",
  question: ensureText(question, "Plan this work"),
  summary: ensureText(response?.summary, "No summary was returned."),
  plan: ensureText(response?.plan, "No execution plan was returned."),
  confidence: clampConfidence(response?.confidence, 0),
  priorities: ensureArray(response?.priorities).map((entry, index) => ({
    title: ensureText(entry?.title, `Priority ${index + 1}`),
    reason: ensureText(entry?.reason, "No reason provided."),
    priority: ensureText(entry?.priority, "medium"),
  })),
  schedule: ensureArray(response?.schedule).map((entry, index) => ({
    slot: ensureText(entry?.slot, `Step ${index + 1}`),
    title: ensureText(entry?.title, `Planned item ${index + 1}`),
    focus: ensureText(entry?.focus, "Focus block"),
  })),
  risks: ensureArray(response?.risks).map((entry, index) => ({
    title: ensureText(entry?.title, `Risk ${index + 1}`),
    risk: ensureText(entry?.risk, "No explicit risk was returned."),
  })),
});

export const normalizeSummaryResult = (response) => ({
  type: "summarize",
  headline: ensureText(response?.headline, "Workspace summary ready"),
  summary: ensureText(response?.summary, "No workspace summary was returned."),
  confidence: clampConfidence(response?.confidence, 0),
  sources: normalizeSources(response?.sources),
  whatMattersNow: ensureArray(response?.whatMattersNow).map((entry, index) => normalizeStructuredItem(entry, index, "attention")),
  recommendations: ensureArray(response?.recommendations).map((entry, index) => normalizeStructuredItem(entry, index, "recommendation")),
  prediction: normalizePrediction(response?.prediction),
});

export const normalizeSearchResult = (query, response) => ({
  type: "search",
  query: ensureText(query, "search"),
  total: Math.max(0, ensureNumber(response?.total, 0)),
  groupedResults: groupSearchResults(response?.results),
});

export const normalizeCommandResult = (command, response) => ({
  type: "automate",
  command: ensureText(command, "Workspace command"),
  intent: ensureText(response?.intent, "workspace_request"),
  intentLabel: ensureText(response?.intentLabel, "Automation preview"),
  confidence: clampConfidence(response?.confidence, 0),
  directAnswer: ensureText(response?.directAnswer, "No automation preview was returned."),
  reasoning: ensureArray(response?.reasoning)
    .map((entry, index) => ensureText(entry, `Reason ${index + 1}`))
    .filter(Boolean),
  proposedActions: ensureArray(response?.proposedActions).map((entry, index) => normalizeStructuredItem(entry, index, "action")),
  recommendations: ensureArray(response?.recommendations).map((entry, index) => normalizeStructuredItem(entry, index, "recommendation")),
  executionPreview: {
    status: ensureText(response?.executionPreview?.status, "preview"),
    safeToAutoRun: Boolean(response?.executionPreview?.safeToAutoRun),
    requiresApproval: Boolean(response?.executionPreview?.requiresApproval),
    approvalReason: ensureText(response?.executionPreview?.approvalReason),
    suggestedRoute: ensureText(response?.executionPreview?.suggestedRoute) || null,
    acceptedAliases: ensureArray(response?.executionPreview?.acceptedAliases)
      .map((entry, index) => ensureText(entry, `Suggestion ${index + 1}`))
      .filter(Boolean),
  },
});

export const buildHistoryEntry = (mode, payload) => {
  if (mode === "ask") {
    return {
      label: ensureText(payload.question, "Workspace question"),
      meta: truncateText(payload.answer, 120) || "Answer ready.",
      state: "Answered",
      tone: "info",
    };
  }

  if (mode === "plan") {
    return {
      label: "AI day plan generated",
      meta: truncateText(payload.summary, 120) || "Plan ready.",
      state: "Planned",
      tone: "trust",
    };
  }

  if (mode === "summarize") {
    return {
      label: ensureText(payload.headline, "Workspace summary generated"),
      meta: truncateText(payload.summary, 120) || "Summary ready.",
      state: "Summary",
      tone: "info",
    };
  }

  if (mode === "search") {
    return {
      label: `Search: ${ensureText(payload.query, "query")}`,
      meta: `${ensureNumber(payload.total, 0)} result(s) grouped by type.`,
      state: "Search",
      tone: "info",
    };
  }

  return {
    label: ensureText(payload.intentLabel, "Automation preview"),
    meta: truncateText(payload.directAnswer, 120) || "Command preview ready.",
    state: "Preview",
    tone: "trust",
  };
};

export const buildBrief = (result) => {
  if (!result || result.type === "error") return null;

  if (result.type === "ask") {
    return {
      headline: "Workspace answer ready",
      summary: truncateText(result.answer, 140) || "Grounded answer ready for review.",
      confidence: result.confidence,
      mode: "grounded-answer",
      sources: [{ label: "Sources", count: result.sources.length }],
    };
  }

  if (result.type === "plan") {
    return {
      headline: result.summary || "Execution plan ready",
      summary: `${result.priorities.length} priority item(s), ${result.schedule.length} planned block(s), ${result.risks.length} risk signal(s).`,
      confidence: result.confidence,
      mode: "review-before-run",
      sources: [
        { label: "Priorities", count: result.priorities.length },
        { label: "Risks", count: result.risks.length },
      ],
    };
  }

  if (result.type === "summarize") {
    return {
      headline: result.headline,
      summary: truncateText(result.summary, 140) || "Workspace summary ready.",
      confidence: result.confidence,
      mode: "workspace-summary",
      sources: result.sources,
    };
  }

  if (result.type === "search") {
    return {
      headline: `Search returned ${result.total} result(s)`,
      summary: `Grouped across ${Object.keys(result.groupedResults).length} result type(s) for "${result.query}".`,
      confidence: Math.min(90, 40 + result.total * 5),
      mode: "search",
      sources: Object.entries(result.groupedResults).map(([label, entries]) => ({ label, count: entries.length })),
    };
  }

  return {
    headline: result.intentLabel,
    summary: `${result.proposedActions.length} action draft(s), ${result.recommendations.length} review cue(s), status ${result.executionPreview?.status || "preview"}.`,
    confidence: result.confidence,
    mode: result.executionPreview?.status || "preview",
    sources: [
      { label: "Actions", count: result.proposedActions.length },
      { label: "Recommendations", count: result.recommendations.length },
    ],
  };
};
