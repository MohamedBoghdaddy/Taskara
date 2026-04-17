import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { aiAnswer, aiPlanToday } from "../api";
import { getTodayTasks } from "../api/tasks";
import Button from "../components/common/Button";
import {
  ActivityTimeline,
  AiBriefCard,
  EmptyStateCard,
  StatusPill,
  StructuredList,
  VerticalCard,
  VerticalPageLayout,
} from "../components/verticals/VerticalPageLayout";
import { SearchIcon, TodayIcon } from "../components/common/Icons";

const quickPrompts = {
  qa: [
    "What changed in my workspace recently?",
    "Which notes matter most for the current work?",
    "What is likely blocked right now?",
  ],
  plan: [
    "Plan my day around the most urgent work.",
    "What should I do first if I only have one good focus block?",
    "Where is the hidden risk in today's plan?",
  ],
};

const modeOptions = [
  {
    key: "qa",
    label: "Workspace Q&A",
    description: "Ask grounded questions about notes, tasks, and the latest workspace context.",
    Icon: SearchIcon,
  },
  {
    key: "plan",
    label: "Plan today",
    description: "Turn today's task list into a focused sequence with visible risks and priorities.",
    Icon: TodayIcon,
  },
];

export default function AIPage() {
  const [mode, setMode] = useState("qa");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([
    {
      id: "welcome",
      label: "Taskara AI is ready",
      meta: "Ask about workspace context or build a review-aware day plan.",
      state: "Ready",
      tone: "info",
    },
  ]);

  const trustItems = useMemo(
    () => [
      {
        id: "trust-1",
        label: "AI suggestions stay separate from execution",
        description: "Taskara keeps a visible line between suggestion, draft, ready for approval, and executed work.",
        state: "Trust-first",
        tone: "trust",
      },
      {
        id: "trust-2",
        label: "Workspace answers show what they used",
        description: "When context is available, source notes and confidence stay visible instead of hiding in a blob.",
        state: "Explained",
        tone: "info",
      },
      {
        id: "trust-3",
        label: "Plans call out risk, not just optimism",
        description: "The planner highlights blockers, stale work, and sequencing risk so the day stays realistic.",
        state: "Review-aware",
        tone: "warning",
      },
    ],
    [],
  );

  const submit = async (event) => {
    event?.preventDefault();
    if (loading) return;

    const question = input.trim() || quickPrompts[mode][0];
    setLoading(true);
    setInput("");

    try {
      if (mode === "qa") {
        const response = await aiAnswer({ question });
        setResult({
          type: "qa",
          question,
          answer: response.answer,
          confidence: response.confidence,
          sources: response.sources || [],
        });
        setHistory((current) => [
          {
            id: `qa-${current.length}`,
            label: question,
            meta: response.answer,
            state: "Answered",
            tone: "info",
          },
          ...current.slice(0, 5),
        ]);
      } else {
        const tasks = await getTodayTasks();
        const response = await aiPlanToday({ tasks });
        setResult({
          type: "plan",
          question,
          summary: response.summary,
          plan: response.plan,
          confidence: response.confidence,
          priorities: response.priorities || [],
          schedule: response.schedule || [],
          risks: response.risks || [],
        });
        setHistory((current) => [
          {
            id: `plan-${current.length}`,
            label: "AI day plan generated",
            meta: response.summary,
            state: "Planned",
            tone: "trust",
          },
          ...current.slice(0, 5),
        ]);
      }
    } catch (error) {
      const message = error.response?.data?.error || "AI is unavailable right now. Check the server AI configuration.";
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

  const activeQuickPrompts = quickPrompts[mode];

  return (
    <VerticalPageLayout
      eyebrow="AI Workspace"
      title="AI assistant for real work"
      subtitle="Use structured AI to understand workspace state, plan the next block of work, and keep reasoning visible before anyone acts on it."
      actions={
        <>
          <Button variant="secondary" onClick={() => setInput(activeQuickPrompts[0])} disabled={loading}>
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
          <VerticalCard title="Mode" subtitle="Switch between workspace understanding and day-planning without losing trust context.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
              {modeOptions.map(({ key, label, description, Icon }) => {
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
            title={mode === "qa" ? "Ask about your workspace" : "Generate a day plan"}
            subtitle={
              mode === "qa"
                ? "Ask for answers grounded in notes and workspace context."
                : "Turn today's tasks into a structured sequence with priorities, flow, and risk."
            }
            actions={<StatusPill tone={mode === "qa" ? "info" : "trust"}>{mode === "qa" ? "Grounded answer" : "Review-aware plan"}</StatusPill>}
          >
            <form onSubmit={submit} style={{ display: "grid", gap: "12px" }}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={4}
                placeholder={
                  mode === "qa"
                    ? "Ask anything about your workspace, notes, or current state..."
                    : "Ask for a plan, risk review, or execution sequence for today..."
                }
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
                {activeQuickPrompts.map((prompt) => (
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
                  {mode === "qa"
                    ? "Answers stay tied to workspace context and show source visibility when available."
                    : "Plans stay in draft mode so you can review sequencing and risk before acting."}
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Thinking..." : mode === "qa" ? "Ask AI" : "Build plan"}
                </Button>
              </div>
            </form>
          </VerticalCard>

          <AiResultPanel result={result} />
        </div>

        <div style={{ display: "grid", gap: "18px" }}>
          <AiBriefCard
            title="AI operating brief"
            brief={
              result?.type === "plan"
                ? {
                    headline: result.summary,
                    summary: result.plan,
                    confidence: result.confidence,
                    mode: "review-before-run",
                    sources: [
                      { label: "Priorities", count: result.priorities?.length || 0 },
                      { label: "Risks", count: result.risks?.length || 0 },
                    ],
                  }
                : result?.type === "qa"
                  ? {
                      headline: "Workspace answer ready",
                      summary: result.answer,
                      confidence: result.confidence,
                      mode: "grounded-answer",
                      sources: [{ label: "Sources", count: result.sources?.length || 0 }],
                    }
                  : null
            }
            emptyText="Run an AI action to see a structured brief, confidence, and context footprint here."
          />

          <VerticalCard title="Why you can trust this" subtitle="Taskara exposes how AI fits into an execution workspace instead of hiding it behind a generic chat bubble.">
            <StructuredList items={trustItems} />
          </VerticalCard>

          <VerticalCard title="Recent AI activity" subtitle="A short trail of the last AI actions so you can re-open context quickly.">
            <ActivityTimeline items={history} emptyText="AI activity will appear here once you start asking questions or building plans." />
          </VerticalCard>
        </div>
      </div>
    </VerticalPageLayout>
  );
}

function AiResultPanel({ result }) {
  if (!result) {
    return (
      <VerticalCard title="Latest AI result" subtitle="Structured outputs appear here once you ask a question or generate a plan.">
        <EmptyStateCard
          title="No AI output yet"
          body="Start with a workspace question or ask Taskara to plan the day around your current tasks."
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

  if (result.type === "qa") {
    return (
      <VerticalCard
        title="Workspace answer"
        subtitle={result.question}
        actions={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <StatusPill tone="info">Confidence {result.confidence}%</StatusPill>
            <StatusPill tone="neutral">Answer only</StatusPill>
          </div>
        }
      >
        <div style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.75, whiteSpace: "pre-wrap", marginBottom: "14px" }}>
          {result.answer}
        </div>
        <StructuredList
          items={(result.sources || []).map((source) => ({
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
        <div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>Priorities</div>
          <StructuredList
            items={(result.priorities || []).map((entry, index) => ({
              id: `priority-${index}`,
              label: entry.title,
              description: entry.reason,
              state: entry.priority || "medium",
              tone: ["urgent", "high"].includes(entry.priority) ? "warning" : "info",
            }))}
            emptyText="No explicit priorities returned."
          />
        </div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>Suggested flow</div>
          <StructuredList
            items={(result.schedule || []).map((entry, index) => ({
              id: `schedule-${index}`,
              label: `${entry.slot}: ${entry.title}`,
              description: entry.focus,
              state: entry.slot,
              tone: "info",
            }))}
            emptyText="No schedule was suggested."
          />
        </div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>Risks</div>
          <StructuredList
            items={(result.risks || []).map((entry, index) => ({
              id: `risk-${index}`,
              label: entry.title,
              description: entry.risk,
              state: "Watch",
              tone: "danger",
            }))}
            emptyText="No major blockers were called out."
          />
        </div>
      </div>
    </VerticalCard>
  );
}
