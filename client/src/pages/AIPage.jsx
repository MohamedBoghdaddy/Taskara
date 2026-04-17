import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  aiAnswer,
  aiCommandCenter,
  aiPlanToday,
  aiWorkspaceSummary,
  search as searchWorkspace,
} from "../api";
import { getTodayTasks } from "../api/tasks";
import Button from "../components/common/Button";
import { useAuthStore } from "../store/authStore";
import {
  ActivityTimeline,
  AiBriefCard,
  EmptyStateCard,
  StatusPill,
  StructuredList,
  VerticalCard,
  VerticalPageLayout,
} from "../components/verticals/VerticalPageLayout";
import {
  SearchIcon,
  TodayIcon,
  WorkflowIcon,
  AnalyticsIcon,
} from "../components/common/Icons";

const MODE_OPTIONS = [
  {
    key: "ask",
    label: "Ask",
    description: "Grounded answers from workspace notes and current context.",
    Icon: SearchIcon,
  },
  {
    key: "plan",
    label: "Plan",
    description: "Turn today's task list into a structured execution sequence.",
    Icon: TodayIcon,
  },
  {
    key: "summarize",
    label: "Summarize",
    description: "Get a concise view of what matters now, risks, and next actions.",
    Icon: AnalyticsIcon,
  },
  {
    key: "search",
    label: "Search",
    description: "Find pages, notes, tasks, and projects from one semantic-ready surface.",
    Icon: SearchIcon,
  },
  {
    key: "automate",
    label: "Automate",
    description: "Convert a natural-language request into a safe action preview.",
    Icon: WorkflowIcon,
  },
];

const QUICK_PROMPTS = {
  ask: [
    "What changed in my workspace recently?",
    "Which notes matter most for the current work?",
    "What is likely blocked right now?",
  ],
  plan: [
    "Plan my day around the most urgent work.",
    "What should I do first if I only have one good focus block?",
    "Where is the hidden risk in today's plan?",
  ],
  summarize: [
    "Summarize what matters now.",
    "What should the team pay attention to today?",
    "Where are the biggest risks in the workspace?",
  ],
  search: [
    "client report",
    "campaign notes",
    "pricing pack",
  ],
  automate: [
    "Create campaign for Ramadan ads",
    "Generate report for this month",
    "Plan my week and assign the next tasks",
  ],
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);
const ensureText = (value, fallback = "") => (typeof value === "string" && value.trim() ? value.trim() : fallback);
const ensureNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const groupSearchResults = (results = []) =>
  ensureArray(results).reduce((groups, entry) => {
    const type = ensureText(entry?.type, "other");
    if (!groups[type]) groups[type] = [];
    groups[type].push(entry);
    return groups;
  }, {});

const getSearchResultRoute = (entry) => {
  if (entry?.type === "page") return entry?.item?.path || null;
  if (entry?.type === "note" && entry?.item?._id) return `/notes/${entry.item._id}`;
  if (entry?.type === "project" && entry?.item?._id) return `/projects/${entry.item._id}`;
  if (entry?.type === "task") return "/tasks";
  return null;
};

const buildHistoryEntry = (mode, payload) => {
  if (mode === "ask") {
    return {
      label: ensureText(payload.question, "Workspace question"),
      meta: ensureText(payload.answer, "Answer ready."),
      state: "Answered",
      tone: "info",
    };
  }

  if (mode === "plan") {
    return {
      label: "AI day plan generated",
      meta: ensureText(payload.summary, "Plan ready."),
      state: "Planned",
      tone: "trust",
    };
  }

  if (mode === "summarize") {
    return {
      label: ensureText(payload.headline, "Workspace summary generated"),
      meta: ensureText(payload.summary, "Summary ready."),
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
    meta: ensureText(payload.directAnswer, "Command preview ready."),
    state: "Preview",
    tone: "trust",
  };
};

export default function AIPage() {
  const { user } = useAuthStore();
  const [mode, setMode] = useState("ask");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([
    {
      id: "welcome",
      label: "Taskara AI is ready",
      meta: "Ask, plan, summarize, search, or preview an automation path.",
      state: "Ready",
      tone: "info",
    },
  ]);

  const workspaceContext = user?.workspaceContext || {};
  const activePrompts = QUICK_PROMPTS[mode];

  const trustItems = useMemo(
    () => [
      {
        id: "trust-1",
        label: "AI stays preview-first",
        description: "Taskara separates suggestion, draft, approval-ready, and executed states so trust remains visible.",
        state: "Trust-first",
        tone: "trust",
      },
      {
        id: "trust-2",
        label: "Sources and confidence stay visible",
        description: "Answers, summaries, and plans expose grounding, confidence, and reasoning instead of hiding them.",
        state: "Explained",
        tone: "info",
      },
      {
        id: "trust-3",
        label: "Automation is gated before action",
        description: "Natural-language commands produce structured previews before any risky execution path can run.",
        state: "Review-aware",
        tone: "warning",
      },
    ],
    [],
  );

  const submit = async (event) => {
    event?.preventDefault();
    if (loading) return;

    const prompt = ensureText(input, activePrompts[0]);
    setInput("");
    setLoading(true);

    try {
      let nextResult = null;

      if (mode === "ask") {
        const response = await aiAnswer({ question: prompt });
        nextResult = {
          type: "ask",
          question: prompt,
          answer: ensureText(response?.answer, "No answer was returned."),
          confidence: ensureNumber(response?.confidence, 0),
          sources: ensureArray(response?.sources),
        };
      } else if (mode === "plan") {
        const tasks = await getTodayTasks();
        const response = await aiPlanToday({ tasks: ensureArray(tasks) });
        nextResult = {
          type: "plan",
          question: prompt,
          summary: ensureText(response?.summary, "No summary was returned."),
          plan: ensureText(response?.plan, "No execution plan was returned."),
          confidence: ensureNumber(response?.confidence, 0),
          priorities: ensureArray(response?.priorities),
          schedule: ensureArray(response?.schedule),
          risks: ensureArray(response?.risks),
        };
      } else if (mode === "summarize") {
        const response = await aiWorkspaceSummary({
          vertical: workspaceContext.vertical,
          surfaceMode: workspaceContext.surfaceMode,
          prompt,
        });
        nextResult = {
          type: "summarize",
          headline: ensureText(response?.headline, "Workspace summary ready"),
          summary: ensureText(response?.summary, "No workspace summary was returned."),
          confidence: ensureNumber(response?.confidence, 0),
          sources: ensureArray(response?.sources),
          whatMattersNow: ensureArray(response?.whatMattersNow),
          recommendations: ensureArray(response?.recommendations),
          prediction: response?.prediction || null,
        };
      } else if (mode === "search") {
        const response = await searchWorkspace(prompt);
        nextResult = {
          type: "search",
          query: prompt,
          total: ensureNumber(response?.total, 0),
          groupedResults: groupSearchResults(response?.results),
        };
      } else {
        const response = await aiCommandCenter({
          command: prompt,
          vertical: workspaceContext.vertical,
          surfaceMode: workspaceContext.surfaceMode,
        });
        nextResult = {
          type: "automate",
          command: prompt,
          intent: ensureText(response?.intent, "workspace_request"),
          intentLabel: ensureText(response?.intentLabel, "Automation preview"),
          confidence: ensureNumber(response?.confidence, 0),
          directAnswer: ensureText(response?.directAnswer, "No automation preview was returned."),
          reasoning: ensureArray(response?.reasoning),
          proposedActions: ensureArray(response?.proposedActions),
          recommendations: ensureArray(response?.recommendations),
          executionPreview: response?.executionPreview || {},
        };
      }

      setResult(nextResult);
      setHistory((current) => [
        {
          id: `${mode}-${Date.now()}`,
          ...buildHistoryEntry(mode, nextResult),
        },
        ...current.slice(0, 5),
      ]);
    } catch (error) {
      const message = error?.response?.data?.error || "AI is unavailable right now. Check the server configuration and try again.";
      toast.error(message);
      setResult({
        type: "error",
        headline: "AI is unavailable",
        body: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <VerticalPageLayout
      eyebrow="AI Workspace"
      title="The operating brain for the workspace"
      subtitle="Use one surface to ask, plan, summarize, search, and preview AI-assisted execution paths across your vertical."
      actions={
        <>
          <Button variant="secondary" onClick={() => setInput(activePrompts[0])} disabled={loading}>
            Use prompt
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Working..." : "Run AI"}
          </Button>
        </>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
          gap: "18px",
        }}
      >
        <div style={{ display: "grid", gap: "18px" }}>
          <VerticalCard title="Modes" subtitle="Switch from understanding to action without leaving the AI workspace.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              {MODE_OPTIONS.map(({ key, label, description, Icon }) => {
                const active = mode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    style={{
                      textAlign: "left",
                      padding: "16px",
                      borderRadius: "18px",
                      border: `1px solid ${active ? "rgba(15,118,110,0.24)" : "rgba(148,163,184,0.18)"}`,
                      background: active ? "rgba(15,118,110,0.08)" : "var(--surface)",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <Icon />
                      <div style={{ fontWeight: 800 }}>{label}</div>
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{description}</div>
                  </button>
                );
              })}
            </div>
          </VerticalCard>

          <VerticalCard
            title={getComposerTitle(mode)}
            subtitle={getComposerSubtitle(mode)}
            actions={<StatusPill tone={mode === "automate" ? "trust" : mode === "plan" ? "warning" : "info"}>{getComposerStatus(mode)}</StatusPill>}
          >
            <form onSubmit={submit} style={{ display: "grid", gap: "12px" }}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={4}
                placeholder={getComposerPlaceholder(mode)}
                style={{
                  padding: "14px 16px",
                  borderRadius: "18px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                  resize: "vertical",
                  lineHeight: 1.6,
                  fontFamily: "inherit",
                }}
              />

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {activePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "999px",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {mode === "automate"
                    ? "Natural-language requests become structured previews, not silent execution."
                    : "Structured output stays visible so the next action is clearer than a chat transcript."}
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Thinking..." : getSubmitLabel(mode)}
                </Button>
              </div>
            </form>
          </VerticalCard>

          <AiResultPanel result={result} />
        </div>

        <div style={{ display: "grid", gap: "18px" }}>
          <AiBriefCard
            title="AI operating brief"
            brief={buildBrief(result)}
            emptyText="Run an AI action to see a structured brief, confidence, and reasoning footprint here."
          />

          <VerticalCard title="Trust controls" subtitle="Taskara keeps AI visible, review-first, and grounded in the current workspace.">
            <StructuredList items={trustItems} />
          </VerticalCard>

          <VerticalCard title="Recent AI activity" subtitle="A short trail of the latest questions, plans, summaries, and previews.">
            <ActivityTimeline items={history} emptyText="AI activity will appear here once you start using this workspace." />
          </VerticalCard>
        </div>
      </div>
    </VerticalPageLayout>
  );
}

function AiResultPanel({ result }) {
  if (!result) {
    return (
      <VerticalCard title="Latest AI result" subtitle="Structured outputs appear here once you ask, plan, summarize, search, or preview an automation request.">
        <EmptyStateCard
          title="No AI output yet"
          body="Start with a workspace question, a planning request, or a natural-language command that Taskara can preview safely."
        />
      </VerticalCard>
    );
  }

  if (result.type === "error") {
    return (
      <VerticalCard title="Latest AI result" subtitle="The system failed safely and surfaced a user-facing explanation.">
        <EmptyStateCard title={result.headline} body={result.body} />
      </VerticalCard>
    );
  }

  if (result.type === "ask") {
    return (
      <VerticalCard
        title="Workspace answer"
        subtitle={result.question}
        actions={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <StatusPill tone="info">Confidence {result.confidence}%</StatusPill>
            <StatusPill tone="neutral">Grounded answer</StatusPill>
          </div>
        }
      >
        <div style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.75, whiteSpace: "pre-wrap", marginBottom: "14px" }}>
          {result.answer}
        </div>
        <StructuredList
          items={result.sources.map((source) => ({
            id: source.noteId || source.title,
            label: source.title,
            description: "Used as supporting workspace context for this answer.",
            state: `Relevance ${source.relevance}`,
            tone: "info",
          }))}
          emptyText="No explicit source notes were available for this answer."
        />
      </VerticalCard>
    );
  }

  if (result.type === "plan") {
    return (
      <VerticalCard
        title="Execution plan"
        subtitle={result.question}
        actions={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <StatusPill tone="info">Confidence {result.confidence}%</StatusPill>
            <StatusPill tone="trust">Draft plan</StatusPill>
          </div>
        }
      >
        <div style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.75, whiteSpace: "pre-wrap", marginBottom: "18px" }}>
          {result.plan}
        </div>
        <div style={{ display: "grid", gap: "16px" }}>
          <SectionList title="Priorities" items={result.priorities.map((entry, index) => ({
            id: `priority-${index}`,
            label: entry.title,
            description: entry.reason,
            state: entry.priority || "medium",
            tone: ["urgent", "high"].includes(entry.priority) ? "warning" : "info",
          }))} emptyText="No explicit priorities returned." />
          <SectionList title="Suggested flow" items={result.schedule.map((entry, index) => ({
            id: `schedule-${index}`,
            label: `${entry.slot}: ${entry.title}`,
            description: entry.focus,
            state: entry.slot,
            tone: "info",
          }))} emptyText="No schedule was suggested." />
          <SectionList title="Risks" items={result.risks.map((entry, index) => ({
            id: `risk-${index}`,
            label: entry.title,
            description: entry.risk,
            state: "Watch",
            tone: "danger",
          }))} emptyText="No major blockers were called out." />
        </div>
      </VerticalCard>
    );
  }

  if (result.type === "summarize") {
    return (
      <VerticalCard
        title="Workspace summary"
        subtitle={result.summary}
        actions={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <StatusPill tone="info">Confidence {result.confidence}%</StatusPill>
            <StatusPill tone="neutral">What matters now</StatusPill>
          </div>
        }
      >
        <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "14px" }}>{result.headline}</div>
        <SectionList title="Attention points" items={result.whatMattersNow} emptyText="No urgent attention items were returned." />
        <div style={{ marginTop: "16px" }}>
          <SectionList title="Recommended next actions" items={result.recommendations} emptyText="No recommendations were returned." />
        </div>
        {result.prediction ? (
          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(148,163,184,0.18)" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)" }}>Predictive signal</div>
              <StatusPill tone="warning">Confidence {ensureNumber(result.prediction.confidence, 0)}%</StatusPill>
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>{ensureText(result.prediction.headline)}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "8px" }}>{ensureText(result.prediction.reasoning)}</div>
            <StructuredList
              items={ensureArray(result.prediction.factors).map((factor, index) => ({
                id: `factor-${index}`,
                label: factor,
                description: "A factor used in the current workspace prediction.",
                state: "Signal",
                tone: "info",
              }))}
              emptyText="No predictive factors were returned."
            />
          </div>
        ) : null}
      </VerticalCard>
    );
  }

  if (result.type === "search") {
    const groupedEntries = Object.entries(result.groupedResults);

    return (
      <VerticalCard
        title="Search results"
        subtitle={`Query: ${result.query}`}
        actions={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <StatusPill tone="info">{result.total} result(s)</StatusPill>
            <StatusPill tone="neutral">Grouped by type</StatusPill>
          </div>
        }
      >
        {groupedEntries.length ? (
          <div style={{ display: "grid", gap: "16px" }}>
            {groupedEntries.map(([type, entries]) => (
              <div key={type}>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px", textTransform: "capitalize" }}>{type}</div>
                <StructuredList
                  items={entries.map((entry, index) => ({
                    id: entry.item?._id || `${type}-${index}`,
                    label: entry.item?.title || entry.item?.name || "Untitled result",
                    description: entry.item?.description || entry.item?.contentText || entry.item?.status || "Open the result for more detail.",
                    state: `Score ${ensureNumber(entry.score, 0)}`,
                    tone: "info",
                    route: getSearchResultRoute(entry),
                  }))}
                  emptyText="No results in this group."
                />
                <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                  {entries.map((entry, index) => {
                    const route = getSearchResultRoute(entry);
                    if (!route) return null;
                    return (
                      <Link key={`${type}-link-${index}`} to={route} style={{ textDecoration: "none" }}>
                        <Button variant="secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                          Open {entry.item?.title || entry.item?.name || type}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateCard title="No search results" body="Try a more specific phrase, a note title, or a client or project name." />
        )}
      </VerticalCard>
    );
  }

  return (
    <VerticalCard
      title="Automation preview"
      subtitle={result.command}
      actions={
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <StatusPill tone="info">Confidence {result.confidence}%</StatusPill>
          <StatusPill tone={result.executionPreview?.requiresApproval ? "trust" : "neutral"}>
            {result.executionPreview?.status || "preview"}
          </StatusPill>
        </div>
      }
    >
      <div style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.75, marginBottom: "16px" }}>{result.directAnswer}</div>

      <SectionList
        title="Reasoning"
        items={result.reasoning.map((entry, index) => ({
          id: `reasoning-${index}`,
          label: entry,
          description: "Why Taskara classified this request the way it did.",
          state: "Reasoning",
          tone: "info",
        }))}
        emptyText="No reasoning was returned."
      />

      <div style={{ marginTop: "16px" }}>
        <SectionList title="Proposed actions" items={result.proposedActions} emptyText="No structured actions were returned." />
      </div>

      <div style={{ marginTop: "16px" }}>
        <SectionList title="Recommendations" items={result.recommendations} emptyText="No recommendations were returned." />
      </div>

      <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(148,163,184,0.18)" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
          <StatusPill tone={result.executionPreview?.requiresApproval ? "trust" : "info"}>
            {result.executionPreview?.requiresApproval ? "Approval path" : "Draft only"}
          </StatusPill>
          <StatusPill tone="neutral">{result.intentLabel}</StatusPill>
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "10px" }}>
          {result.executionPreview?.approvalReason ||
            "This stays as a safe preview until you choose the next execution step."}
        </div>
        {result.executionPreview?.suggestedRoute ? (
          <Link to={result.executionPreview.suggestedRoute} style={{ textDecoration: "none" }}>
            <Button variant="secondary">Open suggested workspace</Button>
          </Link>
        ) : null}
      </div>
    </VerticalCard>
  );
}

function SectionList({ title, items, emptyText }) {
  return (
    <div>
      <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>{title}</div>
      <StructuredList items={ensureArray(items)} emptyText={emptyText} />
    </div>
  );
}

function buildBrief(result) {
  if (!result || result.type === "error") return null;

  if (result.type === "ask") {
    return {
      headline: "Workspace answer ready",
      summary: result.answer,
      confidence: result.confidence,
      mode: "grounded-answer",
      sources: [{ label: "Sources", count: result.sources.length }],
    };
  }

  if (result.type === "plan") {
    return {
      headline: result.summary,
      summary: result.plan,
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
      summary: result.summary,
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
    summary: result.directAnswer,
    confidence: result.confidence,
    mode: result.executionPreview?.status || "preview",
    sources: [
      { label: "Actions", count: result.proposedActions.length },
      { label: "Recommendations", count: result.recommendations.length },
    ],
  };
}

function getComposerTitle(mode) {
  if (mode === "ask") return "Ask about your workspace";
  if (mode === "plan") return "Generate a day plan";
  if (mode === "summarize") return "Summarize workspace state";
  if (mode === "search") return "Search across the workspace";
  return "Convert language into action previews";
}

function getComposerSubtitle(mode) {
  if (mode === "ask") return "Ask for grounded answers from notes and current workspace context.";
  if (mode === "plan") return "Turn today's work into a structured execution sequence with visible risks.";
  if (mode === "summarize") return "Get an action-oriented summary with signals, risks, and next moves.";
  if (mode === "search") return "Find notes, tasks, projects, and pages from one AI-adjacent search surface.";
  return "Describe what you need and let Taskara shape it into a safe, review-first preview.";
}

function getComposerStatus(mode) {
  if (mode === "automate") return "Preview only";
  if (mode === "plan") return "Review-aware plan";
  if (mode === "summarize") return "Operational summary";
  if (mode === "search") return "Unified search";
  return "Grounded answer";
}

function getComposerPlaceholder(mode) {
  if (mode === "ask") return "Ask anything about your workspace, notes, or current state...";
  if (mode === "plan") return "Describe the planning help you need for today...";
  if (mode === "summarize") return "Ask what matters now, where risk is rising, or what changed...";
  if (mode === "search") return "Search for a client, project, note, task, or decision...";
  return "Create campaign for Ramadan ads, assign tasks to team, generate report, or plan my week...";
}

function getSubmitLabel(mode) {
  if (mode === "automate") return "Preview actions";
  if (mode === "search") return "Search";
  if (mode === "summarize") return "Summarize";
  if (mode === "plan") return "Build plan";
  return "Ask AI";
}
