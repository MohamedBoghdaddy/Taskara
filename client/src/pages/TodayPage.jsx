import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { aiPlanToday, getDashboardStats } from "../api";
import { generateDailyNote } from "../api/notes";
import { createTask, getTodayTasks, updateTask } from "../api/tasks";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import {
  AiBriefCard,
  EmptyStateCard,
  LoadingPanel,
  MetricStrip,
  StatusPill,
  StructuredList,
  VerticalCard,
} from "../components/verticals/VerticalPageLayout";

const pageGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.3fr) minmax(300px, 0.9fr)",
  gap: "20px",
};

export default function TodayPage() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [dailyNote, setDailyNote] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [planning, setPlanning] = useState(false);
  const [aiPlan, setAiPlan] = useState(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [tasksResult, statsResult, noteResult] = await Promise.allSettled([
      getTodayTasks(),
      getDashboardStats(),
      generateDailyNote(today),
    ]);

    if (tasksResult.status === "fulfilled") {
      setTasks(tasksResult.value || []);
    } else {
      const message = tasksResult.reason?.response?.data?.error || "Failed to load today tasks";
      setError(message);
      toast.error(message);
    }

    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value || null);
    } else {
      toast.error(statsResult.reason?.response?.data?.error || "Failed to load dashboard stats");
    }

    if (noteResult.status === "fulfilled") {
      setDailyNote(noteResult.value || null);
    } else {
      toast.error(noteResult.reason?.response?.data?.error || "Failed to prepare daily note");
    }

    setLoading(false);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const doneTasks = useMemo(() => tasks.filter((task) => task.status === "done"), [tasks]);
  const pendingTasks = useMemo(() => tasks.filter((task) => task.status !== "done"), [tasks]);
  const overdueTasks = useMemo(
    () => tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done"),
    [tasks],
  );
  const highPriorityTasks = useMemo(
    () => pendingTasks.filter((task) => ["urgent", "high"].includes(task.priority)),
    [pendingTasks],
  );
  const focusMinutes = stats?.focusStats?.totalMinutes || 0;
  const completionRate = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const attentionItems = useMemo(
    () =>
      [
        overdueTasks.length
          ? {
              id: "overdue",
              label: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? "" : "s"} need attention`,
              description: "Clear or reschedule these first so the rest of the day reflects reality.",
              state: "Overdue",
              tone: "danger",
            }
          : null,
        highPriorityTasks.length
          ? {
              id: "high-priority",
              label: `${highPriorityTasks.length} high-priority task${highPriorityTasks.length === 1 ? "" : "s"} are still open`,
              description: "Protect time for the most important work before lower-value tasks expand.",
              state: "Priority",
              tone: "warning",
            }
          : null,
        !pendingTasks.length && tasks.length
          ? {
              id: "clear",
              label: "The queue is clear",
              description: "Today looks under control. Use the extra time to plan, capture, or review.",
              state: "Stable",
              tone: "success",
            }
          : null,
        !tasks.length
          ? {
              id: "empty",
              label: "No tasks are planned yet",
              description: "Capture one or two outcomes for today so the workspace can prioritize them.",
              state: "Needs plan",
              tone: "info",
            }
          : null,
      ].filter(Boolean),
    [highPriorityTasks.length, overdueTasks.length, pendingTasks.length, tasks.length],
  );

  const toggleTask = async (task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      const updated = await updateTask(task._id, { status: newStatus });
      setTasks((current) => current.map((entry) => (entry._id === task._id ? updated : entry)));
    } catch {
      toast.error("Failed to update task");
    }
  };

  const addTask = async (event) => {
    event.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const task = await createTask({ title: newTaskTitle.trim(), status: "todo", priority: "medium" });
      setTasks((current) => [task, ...current]);
      setNewTaskTitle("");
    } catch {
      toast.error("Failed to create task");
    }
  };

  const buildPlan = async () => {
    setPlanning(true);

    try {
      const result = await aiPlanToday({ tasks: pendingTasks });
      setAiPlan(result);
    } catch (planError) {
      toast.error(planError.response?.data?.error || "AI planning is unavailable right now");
    } finally {
      setPlanning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "32px", maxWidth: "1180px", margin: "0 auto" }}>
        <LoadingPanel title="Loading today's workspace" subtitle="Pulling tasks, focus stats, and daily context." />
      </div>
    );
  }

  if (error && !tasks.length) {
    return (
      <div style={{ padding: "32px", maxWidth: "1180px", margin: "0 auto" }}>
        <EmptyStateCard
          title="Today is unavailable"
          body={`${error}. Retry once the workspace and API connection are healthy.`}
          action={<Button onClick={load}>Retry</Button>}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 24px 48px", maxWidth: "1180px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "20px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: "28px",
        }}
      >
        <div style={{ flex: "1 1 520px" }}>
          <div
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 800,
              color: "#64748b",
              marginBottom: "10px",
            }}
          >
            Daily workspace
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 40px)", letterSpacing: "-0.05em", margin: "0 0 12px" }}>Today</h1>
          <div style={{ fontSize: "15px", lineHeight: 1.7, color: "var(--text-secondary)", maxWidth: "720px" }}>
            {format(new Date(), "EEEE, MMMM d")} - a focused view of what needs attention, what can wait, and what AI can help sequence next.
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={buildPlan} disabled={planning}>
            {planning ? "Planning..." : "Plan with AI"}
          </Button>
          <Link to="/tasks" style={{ textDecoration: "none" }}>
            <Button>Open tasks</Button>
          </Link>
        </div>
      </div>

      <MetricStrip
        items={[
          { label: "Done today", value: doneTasks.length, note: `${completionRate}% completion rate` },
          { label: "Remaining", value: pendingTasks.length, note: "Open tasks still in play today" },
          { label: "Overdue", value: overdueTasks.length, note: overdueTasks.length ? "Re-plan these first" : "Nothing overdue right now" },
          { label: "Focus mins", value: focusMinutes, note: "Completed focus time captured so far" },
        ]}
      />

      <div style={pageGridStyle}>
        <div style={{ display: "grid", gap: "18px" }}>
          <VerticalCard title="What needs attention today" subtitle="A quick triage view of what is risky, urgent, or still undefined.">
            <StructuredList items={attentionItems} emptyText="Nothing urgent needs attention right now." />
          </VerticalCard>

          <VerticalCard
            title="Today's task board"
            subtitle="Capture new work quickly, then keep the visible queue small and honest."
            actions={<StatusPill tone={pendingTasks.length ? "warning" : "success"}>{pendingTasks.length ? `${pendingTasks.length} open` : "Clear"}</StatusPill>}
          >
            <form onSubmit={addTask} style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              <input
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="Capture a task for today..."
                style={{
                  flex: "1 1 240px",
                  padding: "10px 14px",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              <Button type="submit">Add task</Button>
            </form>

            {pendingTasks.length ? (
              <div style={{ display: "grid", gap: "10px" }}>
                {pendingTasks.map((task) => (
                  <TaskRow key={task._id} task={task} onToggle={toggleTask} />
                ))}
              </div>
            ) : (
              <EmptyStateCard
                title="No open tasks for today"
                body="Capture a task above or use the AI plan to shape the next work block."
              />
            )}

            {doneTasks.length ? (
              <div style={{ marginTop: "18px" }}>
                <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b", marginBottom: "8px" }}>
                  Completed
                </div>
                <div style={{ display: "grid", gap: "10px" }}>
                  {doneTasks.map((task) => (
                    <TaskRow key={task._id} task={task} onToggle={toggleTask} />
                  ))}
                </div>
              </div>
            ) : null}
          </VerticalCard>
        </div>

        <div style={{ display: "grid", gap: "18px" }}>
          <AiBriefCard
            title="AI day plan"
            brief={
              aiPlan
                ? {
                    headline: aiPlan.summary,
                    summary: aiPlan.plan,
                    confidence: aiPlan.confidence,
                    mode: "review-before-run",
                    sources: [
                      { label: "Priorities", count: aiPlan.priorities?.length || 0 },
                      { label: "Risks", count: aiPlan.risks?.length || 0 },
                    ],
                  }
                : null
            }
            emptyText="Generate an AI plan to turn the current task list into a focused execution sequence."
          />

          {aiPlan ? (
            <VerticalCard title="AI planning details" subtitle="Structured guidance that keeps risks and the next work block visible.">
              <div style={{ display: "grid", gap: "14px" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, marginBottom: "8px" }}>Priorities</div>
                  <StructuredList
                    items={(aiPlan.priorities || []).map((entry, index) => ({
                      id: `priority-${index}`,
                      label: entry.title,
                      description: entry.reason,
                      state: entry.priority || "priority",
                      tone: entry.priority === "urgent" || entry.priority === "high" ? "warning" : "info",
                    }))}
                    emptyText="AI did not return a priority list."
                  />
                </div>

                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, marginBottom: "8px" }}>Suggested flow</div>
                  <StructuredList
                    items={(aiPlan.schedule || []).map((entry, index) => ({
                      id: `schedule-${index}`,
                      label: `${entry.slot}: ${entry.title}`,
                      description: entry.focus,
                      state: entry.slot,
                      tone: "info",
                    }))}
                    emptyText="No schedule suggestions yet."
                  />
                </div>

                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, marginBottom: "8px" }}>Risks</div>
                  <StructuredList
                    items={(aiPlan.risks || []).map((entry, index) => ({
                      id: `risk-${index}`,
                      label: entry.title,
                      description: entry.risk,
                      state: "Watch",
                      tone: "danger",
                    }))}
                    emptyText="No risks called out right now."
                  />
                </div>
              </div>
            </VerticalCard>
          ) : null}

          <VerticalCard title="Daily note" subtitle="Keep the narrative of the day close to the work so decisions are easier to revisit later.">
            {dailyNote ? (
              <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)" }}>{dailyNote.title}</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Open the daily note to capture context, blockers, follow-up decisions, and end-of-day learnings.
                </div>
                <Link to={`/daily/${today}`} style={{ textDecoration: "none" }}>
                  <Button variant="secondary">Open daily note</Button>
                </Link>
              </div>
            ) : (
              <EmptyStateCard
                title="Daily note is not ready"
                body="Retry the page if you want Taskara to create today's note scaffold automatically."
              />
            )}
          </VerticalCard>

          <VerticalCard title="Quick actions" subtitle="Jump into the next most likely action without scanning the whole workspace.">
            <div style={{ display: "grid", gap: "10px" }}>
              <Link to="/pomodoro" style={{ textDecoration: "none" }}>
                <Button variant="secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                  Start a focus session
                </Button>
              </Link>
              <Link to="/inbox" style={{ textDecoration: "none" }}>
                <Button variant="secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                  Capture to inbox
                </Button>
              </Link>
              <Link to={`/daily/${today}`} style={{ textDecoration: "none" }}>
                <Button variant="secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                  Re-open daily note
                </Button>
              </Link>
            </div>
          </VerticalCard>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle }) {
  const done = task.status === "done";
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && !done;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "16px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <input
        type="checkbox"
        checked={done}
        onChange={() => onToggle(task)}
        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--primary)" }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: done ? "line-through" : "none",
            color: done ? "var(--text-muted)" : "var(--text-primary)",
          }}
        >
          {task.title}
        </div>
        {task.dueDate ? (
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Due {new Date(task.dueDate).toLocaleDateString()}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
        {overdue ? <StatusPill tone="danger">Overdue</StatusPill> : null}
        {task.priority && task.priority !== "medium" ? <Badge type={task.priority} label={task.priority} /> : null}
      </div>
    </div>
  );
}
