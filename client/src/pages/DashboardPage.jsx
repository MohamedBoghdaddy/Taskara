import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  AnalyticsIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  PlugIcon,
  ShieldIcon,
  WorkflowIcon,
} from "../components/common/Icons";
import {
  approveWorkflowItem,
  assignWorkflowItem,
  controlWorkflowItem,
  executeWorkflowItem,
  getWorkflowDashboard,
  ingestWorkflowInput,
} from "../api/workflows";
import { AUDIENCE_CONTENT, AUDIENCE_LIST } from "../data/workflowAudienceContent";
import { useAuthStore } from "../store/authStore";

const tone = {
  queued: { bg: "#e2e8f0", color: "#475569" },
  ready: { bg: "#dbeafe", color: "#1d4ed8" },
  awaiting_approval: { bg: "#fef3c7", color: "#b45309" },
  scheduled: { bg: "#dcfce7", color: "#15803d" },
  in_progress: { bg: "#ede9fe", color: "#6d28d9" },
  blocked: { bg: "#fee2e2", color: "#b91c1c" },
  completed: { bg: "#dcfce7", color: "#15803d" },
  cancelled: { bg: "#e2e8f0", color: "#475569" },
  paused: { bg: "#fef3c7", color: "#92400e" },
  failed: { bg: "#fee2e2", color: "#b91c1c" },
};

function StatCard({ label, value, detail, icon }) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "20px",
        background: "rgba(255,255,255,0.88)",
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 18px 60px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ display: "inline-flex", width: "38px", height: "38px", borderRadius: "14px", alignItems: "center", justifyContent: "center", background: "rgba(15,118,110,0.10)", marginBottom: "12px" }}>
        {icon}
      </div>
      <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "10px" }}>
        {label}
      </div>
      <div style={{ fontSize: "34px", fontWeight: 900, letterSpacing: "-0.05em", color: "#0f172a" }}>{value}</div>
      <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.6, marginTop: "8px" }}>{detail}</div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "18px",
        background: "#ffffff",
        border: "1px solid rgba(148,163,184,0.16)",
      }}
    >
      <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a" }}>{value}</div>
    </div>
  );
}

function ActionButton({ label, onClick, disabled, variant = "secondary" }) {
  const palette =
    variant === "primary"
      ? { bg: "#0f766e", color: "#fff", border: "transparent" }
      : variant === "danger"
        ? { bg: "#fff1f2", color: "#be123c", border: "rgba(244,63,94,0.18)" }
        : { bg: "#ffffff", color: "#334155", border: "rgba(148,163,184,0.18)" };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 14px",
        borderRadius: "999px",
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.color,
        fontWeight: 700,
        fontSize: "12px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

function WorkflowItemCard({ item, onApprove, onReject, onPause, onResume, onCancel, onRun, onClaim }) {
  const statusTone = tone[item.status] || tone.ready;
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "22px",
        background: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 18px 60px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "12px" }}>
        <div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
            <div style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a" }}>{item.title}</div>
            <div style={{ padding: "6px 10px", borderRadius: "999px", background: statusTone.bg, color: statusTone.color, fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {String(item.status).replace(/_/g, " ")}
            </div>
          </div>
          <div style={{ fontSize: "14px", lineHeight: 1.7, color: "#475569", maxWidth: "820px" }}>{item.description || item.sourceContext?.excerpt}</div>
        </div>
        <div style={{ fontSize: "12px", color: "#64748b", textAlign: "right" }}>
          <div>{item.workflowType}</div>
          <div>{item.sourceType}</div>
          {item.stage ? <div>Stage: {item.stage}</div> : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "14px" }}>
        <div style={{ padding: "14px", borderRadius: "16px", background: "#f8fafc" }}>
          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: "8px" }}>
            Why this was assigned
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.7, color: "#334155" }}>
            {item.assignee?.reason || "Assignment is pending."}
          </div>
        </div>
        <div style={{ padding: "14px", borderRadius: "16px", background: "#f8fafc" }}>
          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: "8px" }}>
            Owner and control
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.7, color: "#334155" }}>
            {item.assignee?.name || "Unassigned"}
            {item.assignee?.manualOverride ? " (manual override)" : ""}
          </div>
          {item.dueAt ? (
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
              Due {new Date(item.dueAt).toLocaleString()}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
        {item.executionPlan?.map((step) => (
          <div
            key={step.id}
            style={{
              padding: "8px 12px",
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.18)",
              background: step.status === "done" ? "#dcfce7" : step.status === "failed" ? "#fee2e2" : step.status === "waiting" ? "#eff6ff" : "#ffffff",
              color: step.status === "done" ? "#15803d" : step.status === "failed" ? "#b91c1c" : "#334155",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {step.label}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
        {item.approvalStatus === "pending" ? (
          <>
            <ActionButton label="Approve" variant="primary" onClick={onApprove} />
            <ActionButton label="Reject" variant="danger" onClick={onReject} />
          </>
        ) : null}
        <ActionButton label="Run ready actions" onClick={onRun} />
        {item.status === "paused" ? (
          <ActionButton label="Resume" onClick={onResume} />
        ) : (
          <ActionButton label="Pause" onClick={onPause} />
        )}
        <ActionButton label="Cancel" variant="danger" onClick={onCancel} />
        <ActionButton label="Route to me" onClick={onClaim} />
      </div>

      <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: "8px" }}>
        Audit trail
      </div>
      <div style={{ display: "grid", gap: "8px" }}>
        {(item.auditTrail || []).slice(-3).reverse().map((entry, index) => (
          <div key={`${entry.type}-${index}`} style={{ padding: "12px 14px", borderRadius: "16px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)" }}>
            <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>{entry.message}</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
              {new Date(entry.at).toLocaleString()} | {entry.actorType}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [audience, setAudience] = useState("startups");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sourceType: "slack",
    title: "",
    text: "",
    autoExecute: true,
  });

  const refresh = useCallback(async (nextAudience = audience) => {
    setLoading(true);
    try {
      const data = await getWorkflowDashboard(nextAudience);
      setDashboard(data);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load execution hub");
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => {
    refresh(audience);
  }, [audience, refresh]);

  useEffect(() => {
    const readsFirst = dashboard?.audience?.readsFirst;
    if (readsFirst) {
      setForm((current) => ({ ...current, sourceType: readsFirst }));
    }
  }, [dashboard?.audience?.readsFirst]);

  const handleIngest = async () => {
    const fallback = dashboard?.emptyStateExample;
    const payload = {
      audienceType: audience,
      sourceType: form.sourceType || dashboard?.audience?.readsFirst || "manual",
      title: form.title || fallback?.title || `${AUDIENCE_CONTENT[audience].label} workflow`,
      text: form.text || fallback?.text || "",
      autoExecute: form.autoExecute,
    };

    if (!payload.text.trim()) {
      toast.error("Add a source input so Taskara has context to execute from.");
      return;
    }

    setSaving(true);
    try {
      const result = await ingestWorkflowInput(payload);
      toast.success(result.duplicate ? "This source was already ingested." : "Workflow input ingested and routed.");
      setForm((current) => ({ ...current, title: "", text: "" }));
      await refresh(audience);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to ingest workflow input");
    } finally {
      setSaving(false);
    }
  };

  const runItemAction = async (promiseFactory, successMessage) => {
    setSaving(true);
    try {
      await promiseFactory();
      toast.success(successMessage);
      await refresh(audience);
    } catch (error) {
      toast.error(error.response?.data?.error || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const audienceInfo = AUDIENCE_CONTENT[audience];

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "28px",
        background:
          "radial-gradient(circle at top right, rgba(14,165,233,0.12), transparent 28%), linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
      }}
    >
      <div style={{ maxWidth: "1220px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "24px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "999px", background: "rgba(15,118,110,0.10)", color: "#115e59", border: "1px solid rgba(15,118,110,0.16)", fontSize: "12px", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "14px" }}>
              <WorkflowIcon size="sm" />
              Workflow execution hub
            </div>
            <h1 style={{ fontSize: "42px", lineHeight: 1.02, letterSpacing: "-0.05em", margin: "0 0 12px" }}>
              {audienceInfo.headline}
            </h1>
            <p style={{ maxWidth: "900px", fontSize: "16px", lineHeight: 1.8, color: "#475569", margin: 0 }}>
              {audienceInfo.subheadline}
            </p>
          </div>
          <div style={{ padding: "18px 20px", borderRadius: "22px", background: "rgba(255,255,255,0.88)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 18px 60px rgba(15,23,42,0.06)", minWidth: "260px" }}>
            <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "8px" }}>
              Operator
            </div>
            <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "4px" }}>
              {user?.name || user?.email}
            </div>
            <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.7 }}>
              Approval-sensitive external actions are guarded automatically. Assignment reasons and audit logs stay visible on every item.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
          {AUDIENCE_LIST.map((entry) => (
            <button
              key={entry.key}
              onClick={() => setAudience(entry.key)}
              style={{
                padding: "12px 16px",
                borderRadius: "999px",
                border: `1px solid ${audience === entry.key ? "rgba(15,118,110,0.18)" : "rgba(148,163,184,0.18)"}`,
                background: audience === entry.key ? "rgba(15,118,110,0.10)" : "#ffffff",
                color: audience === entry.key ? "#0f766e" : "#334155",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {loading || !dashboard ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading workflow execution data...</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
              <StatCard label="Active workflows" value={dashboard.summary.activeCount} detail="Execution items currently moving through the workflow." icon={<WorkflowIcon size="sm" color="#0f766e" />} />
              <StatCard label="Pending approvals" value={dashboard.summary.pendingApprovals} detail="Risky external actions waiting for operator approval." icon={<ShieldIcon size="sm" color="#0f766e" />} />
              <StatCard label="Completed this week" value={dashboard.summary.completedThisWeek} detail="Workflow items that reached a finished state in the last 7 days." icon={<CheckCircleIcon size="sm" color="#0f766e" />} />
              <StatCard label="Scheduled follow-ups" value={dashboard.summary.scheduledFollowUps} detail="Active sequences with timing controls and stop conditions." icon={<ClockIcon size="sm" color="#0f766e" />} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)", gap: "18px", marginBottom: "24px" }}>
              <div style={{ padding: "24px", borderRadius: "24px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 18px 60px rgba(15,23,42,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "8px" }}>
                      Ingest a workflow input
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.04em", color: "#0f172a" }}>
                      Feed Taskara the real operational signal
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        sourceType: dashboard.emptyStateExample.sourceType,
                        title: dashboard.emptyStateExample.title,
                        text: dashboard.emptyStateExample.text,
                      }))
                    }
                    style={{
                      padding: "10px 14px",
                      borderRadius: "999px",
                      border: "1px solid rgba(148,163,184,0.18)",
                      background: "#ffffff",
                      color: "#334155",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Use example
                  </button>
                </div>

                <div style={{ display: "grid", gap: "14px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)", gap: "12px" }}>
                    <select
                      value={form.sourceType}
                      onChange={(event) => setForm((current) => ({ ...current, sourceType: event.target.value }))}
                      style={{ padding: "14px 16px", borderRadius: "16px", border: "1px solid rgba(148,163,184,0.18)", background: "#f8fafc" }}
                    >
                      {(dashboard.audience.sourceTypes || ["manual"]).map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                    <input
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Short label for this operational input"
                      style={{ padding: "14px 16px", borderRadius: "16px", border: "1px solid rgba(148,163,184,0.18)", background: "#f8fafc" }}
                    />
                  </div>

                  <textarea
                    value={form.text}
                    onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
                    rows={7}
                    placeholder="Paste the email thread, Slack summary, client brief, or lead intake details here."
                    style={{ padding: "16px", borderRadius: "18px", border: "1px solid rgba(148,163,184,0.18)", background: "#f8fafc", resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }}
                  />

                  <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "#334155", fontSize: "14px" }}>
                    <input
                      type="checkbox"
                      checked={form.autoExecute}
                      onChange={(event) => setForm((current) => ({ ...current, autoExecute: event.target.checked }))}
                    />
                    Execute safe actions immediately and stop for approvals when risk is detected.
                  </label>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.7 }}>
                      Taskara will preserve source context, group related work, prevent duplicates where possible, and attach a visible audit trail.
                    </div>
                    <ActionButton label={saving ? "Working..." : "Ingest and run"} variant="primary" onClick={handleIngest} disabled={saving} />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: "18px" }}>
                <div style={{ padding: "22px", borderRadius: "24px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 18px 60px rgba(15,23,42,0.06)" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "12px" }}>
                    Why this audience buys
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: "10px" }}>
                    {dashboard.audience.painPoint}
                  </div>
                  <div style={{ fontSize: "14px", lineHeight: 1.8, color: "#475569", marginBottom: "16px" }}>
                    {audienceInfo.fiveQuestions.automaticAction}
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {dashboard.audience.workflowChain.map((step) => (
                      <div key={step} style={{ padding: "8px 12px", borderRadius: "999px", background: "rgba(15,118,110,0.08)", border: "1px solid rgba(15,118,110,0.14)", color: "#0f766e", fontWeight: 700, fontSize: "12px" }}>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: "22px", borderRadius: "24px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 18px 60px rgba(15,23,42,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <PlugIcon size="sm" color="#0f766e" />
                    <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                      Sync coverage
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {dashboard.integrationCoverage.map((entry) => (
                      <div key={entry.provider} style={{ padding: "12px 14px", borderRadius: "16px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)", display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{entry.provider}</div>
                        <div style={{ fontSize: "12px", fontWeight: 800, color: entry.connected ? "#0f766e" : "#b45309" }}>
                          {entry.status.replace(/_/g, " ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "24px" }}>
              {(dashboard.audience.metrics || []).map((metric) => (
                <MetricCard key={metric.id} label={metric.label} value={dashboard.metrics?.[metric.id] ?? 0} />
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)", gap: "18px" }}>
              <div style={{ display: "grid", gap: "18px" }}>
                {(dashboard.items || []).length === 0 ? (
                  <div style={{ padding: "26px", borderRadius: "24px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 18px 60px rgba(15,23,42,0.06)", color: "#475569", lineHeight: 1.8 }}>
                    No execution items yet for this audience. Paste a real operational source above and Taskara will create structured execution work with approvals, audit logs, and sync intent.
                  </div>
                ) : (
                  dashboard.items.map((item) => (
                    <WorkflowItemCard
                      key={item._id}
                      item={item}
                      onApprove={() => runItemAction(() => approveWorkflowItem(item._id, "approve"), "Approval granted")}
                      onReject={() => runItemAction(() => approveWorkflowItem(item._id, "reject"), "Approval rejected")}
                      onPause={() => runItemAction(() => controlWorkflowItem(item._id, "pause"), "Workflow paused")}
                      onResume={() => runItemAction(() => controlWorkflowItem(item._id, "resume"), "Workflow resumed")}
                      onCancel={() => runItemAction(() => controlWorkflowItem(item._id, "cancel"), "Workflow cancelled")}
                      onRun={() => runItemAction(() => executeWorkflowItem(item._id), "Ready actions executed")}
                      onClaim={() => runItemAction(() => assignWorkflowItem(item._id, user?._id), "You now own this workflow item")}
                    />
                  ))
                )}
              </div>

              <div style={{ display: "grid", gap: "18px" }}>
                <div style={{ padding: "22px", borderRadius: "24px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 18px 60px rgba(15,23,42,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <ShieldIcon size="sm" color="#0f766e" />
                    <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                      Approval queue
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "12px" }}>
                    {(dashboard.approvals || []).length === 0 ? (
                      <div style={{ color: "#475569", lineHeight: 1.7 }}>No approvals are waiting right now.</div>
                    ) : (
                      dashboard.approvals.map((approval) => (
                        <div key={approval._id} style={{ padding: "14px", borderRadius: "16px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)" }}>
                          <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>{approval.actionLabel}</div>
                          <div style={{ fontSize: "13px", lineHeight: 1.7, color: "#475569", marginBottom: "10px" }}>{approval.reason}</div>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <ActionButton label="Approve" variant="primary" onClick={() => runItemAction(() => approveWorkflowItem(approval.executionItemId, "approve"), "Approval granted")} />
                            <ActionButton label="Reject" variant="danger" onClick={() => runItemAction(() => approveWorkflowItem(approval.executionItemId, "reject"), "Approval rejected")} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div style={{ padding: "22px", borderRadius: "24px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 18px 60px rgba(15,23,42,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <AnalyticsIcon size="sm" color="#0f766e" />
                    <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                      Migration safety preview
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {(dashboard.migrationPreview?.mappingPreview || []).map((entry) => (
                      <div key={entry.sourceField} style={{ padding: "12px 14px", borderRadius: "16px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>{entry.sourceField}</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{entry.targetField}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: "22px", borderRadius: "24px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 18px 60px rgba(15,23,42,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <CalendarCheckIcon size="sm" color="#0f766e" />
                    <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                      Trust controls
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {audienceInfo.trustControls.map((item) => (
                      <div key={item} style={{ padding: "12px 14px", borderRadius: "16px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)", fontSize: "13px", lineHeight: 1.7, color: "#334155" }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: "22px", borderRadius: "24px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 18px 60px rgba(15,23,42,0.06)" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "12px" }}>
                    Recent workflow runs
                  </div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {(dashboard.runs || []).map((run) => (
                      <div key={run._id} style={{ padding: "12px 14px", borderRadius: "16px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)" }}>
                        <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginBottom: "4px" }}>{run.input?.title || audienceInfo.label}</div>
                        <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.7 }}>
                          {run.workflowType} | {run.status} | {run.extractionSummary?.itemCount || 0} item(s)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
