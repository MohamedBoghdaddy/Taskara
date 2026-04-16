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
  submitWorkflowFeedback,
} from "../api/workflows";
import {
  completeOnboarding,
  getOnboardingStatus,
  runOnboardingDemo,
  selectOnboardingAudience,
} from "../api/operations";
import { AUDIENCE_CONTENT, AUDIENCE_LIST } from "../data/workflowAudienceContent";
import { getCurrentPlan } from "../api";
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

const formatLabel = (value = "") => String(value).replace(/_/g, " ");
const normalizeConfidenceScore = (value) => {
  const number = Number(value || 0);
  return number <= 1 ? Math.round(number * 100) : Math.round(number);
};

const getLatestSyncLog = (item) => {
  const syncLogs = item?.syncLogs || [];
  return syncLogs.length ? syncLogs[syncLogs.length - 1] : null;
};

const hasScheduledFollowUp = (item) =>
  Boolean(item?.followUp?.active || (item?.actionLogs || []).some((entry) => entry.status === "scheduled"));

const FEEDBACK_OPTIONS = [
  { key: "wrong_action", label: "Wrong action" },
  { key: "wrong_assignment", label: "Wrong assignment" },
  { key: "wrong_output", label: "Wrong output" },
  { key: "wrong_recipient", label: "Wrong recipient" },
  { key: "wrong_sync_target", label: "Wrong sync target" },
  { key: "unclear_explanation", label: "Unclear explanation" },
  { key: "should_have_required_approval", label: "Should have required approval" },
];

const TYPICAL_VOLUME = {
  recruiters: "3-5 workflows per day",
  startups: "4-7 workflows per day",
  agencies: "3-6 workflows per day",
  realestate: "5-8 workflows per day",
};

const getSafetyTone = (level = "medium") =>
  level === "high"
    ? { bg: "#fff1f2", color: "#be123c", border: "rgba(244,63,94,0.18)" }
    : level === "medium"
      ? { bg: "#fff7ed", color: "#b45309", border: "rgba(251,146,60,0.20)" }
      : { bg: "#ecfdf5", color: "#15803d", border: "rgba(16,185,129,0.18)" };

const getNextSafetyAction = (item) => {
  const relevant =
    (item?.actionLogs || []).find((entry) => ["awaiting_approval", "scheduled", "pending", "failed"].includes(entry.status)) ||
    [...(item?.actionLogs || [])].reverse().find((entry) => entry.status === "executed") ||
    null;
  return relevant;
};

const buildTypicalUsage = ({ audienceKey, audienceInfo, planState, integrationCoverage = [] }) => {
  const readyConnectors = integrationCoverage.filter((entry) => entry.writebackReady).map((entry) => formatLabel(entry.provider));
  const connectorLabel =
    readyConnectors.length >= 2
      ? `${readyConnectors.slice(0, 2).join(" + ")} connected`
      : readyConnectors.length === 1
        ? `${readyConnectors[0]} connected`
        : `${(audienceInfo.syncTargets || []).slice(0, 2).join(" + ")} readying`;

  return [
    TYPICAL_VOLUME[audienceKey] || "2-4 workflows per day",
    connectorLabel,
    planState?.planDef?.autoExecution
      ? "Auto follow-ups enabled"
      : "Manual approvals on risky actions",
  ];
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

function UsageMeter({ label, usage }) {
  if (!usage) return null;
  const percent = usage.unlimited ? 0 : Math.min(usage.percent || 0, 100);
  return (
    <div style={{ padding: "14px", borderRadius: "18px", background: "#ffffff", border: "1px solid rgba(148,163,184,0.16)" }}>
      <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a" }}>
          {usage.used}
          {!usage.unlimited ? <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "6px" }}>/ {usage.limit}</span> : null}
        </div>
        <div style={{ fontSize: "12px", color: percent >= 90 ? "#b91c1c" : percent >= 75 ? "#b45309" : "#0f766e", fontWeight: 800 }}>
          {usage.unlimited ? "Unlimited" : `${percent}% used`}
        </div>
      </div>
      {!usage.unlimited ? (
        <div style={{ height: "8px", borderRadius: "999px", background: "#e2e8f0", overflow: "hidden" }}>
          <div style={{ width: `${percent}%`, height: "100%", background: percent >= 90 ? "#ef4444" : percent >= 75 ? "#f59e0b" : "#0f766e" }} />
        </div>
      ) : null}
      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
        {usage.unlimited ? "No plan cap" : `${usage.remaining} remaining this month`}
      </div>
    </div>
  );
}

function TypicalUsageCard({ items = [] }) {
  if (!items.length) return null;
  return (
    <div
      style={{
        padding: "18px",
        borderRadius: "20px",
        background: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 18px 60px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "10px" }}>
        Typical usage
      </div>
      <div style={{ display: "grid", gap: "10px" }}>
        {items.map((item) => (
          <div key={item} style={{ display: "flex", gap: "10px", alignItems: "center", color: "#334155", fontSize: "13px", lineHeight: 1.6 }}>
            <CheckCircleIcon size="xs" color="#0f766e" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfidenceCard({ trustSummary }) {
  if (!trustSummary) return null;
  const toneValue = getSafetyTone(trustSummary.level);
  return (
    <div
      style={{
        padding: "18px",
        borderRadius: "20px",
        background: toneValue.bg,
        border: `1px solid ${toneValue.border}`,
      }}
    >
      <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "10px" }}>
        System confidence
      </div>
      <div style={{ fontSize: "26px", fontWeight: 900, letterSpacing: "-0.04em", color: toneValue.color, marginBottom: "6px" }}>
        {trustSummary.label}
      </div>
      <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.7, marginBottom: "10px" }}>
        {trustSummary.explanation}
      </div>
      <div style={{ display: "grid", gap: "6px" }}>
        {(trustSummary.reasons || []).slice(0, 3).map((reason) => (
          <div key={reason} style={{ fontSize: "12px", color: toneValue.color, lineHeight: 1.6 }}>
            {reason}
          </div>
        ))}
      </div>
    </div>
  );
}

function WarningStrip({ items = [] }) {
  if (!items.length) return null;
  return (
    <div style={{ display: "grid", gap: "10px", marginBottom: "24px" }}>
      {items.map((entry) => (
        <div
          key={`${entry.kind}-${entry.message}`}
          style={{
            padding: "14px 16px",
            borderRadius: "18px",
            background: entry.kind === "danger" ? "#fff1f2" : "#fff7ed",
            border: `1px solid ${entry.kind === "danger" ? "rgba(244,63,94,0.18)" : "rgba(251,146,60,0.22)"}`,
            color: entry.kind === "danger" ? "#be123c" : "#9a3412",
            fontSize: "13px",
            lineHeight: 1.7,
          }}
        >
          <strong>{entry.title}</strong> {entry.message}
        </div>
      ))}
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

function OnboardingPanel({
  onboarding,
  audience,
  saving,
  onSelectAudience,
  onRunDemo,
  onComplete,
  onConnectIntegration,
}) {
  if (!onboarding || onboarding.completedAt) return null;

  const stepTone = (step) =>
    onboarding.currentStep === step
      ? { bg: "rgba(15,118,110,0.10)", border: "rgba(15,118,110,0.18)", color: "#0f766e" }
      : onboarding.currentStep > step
        ? { bg: "#dcfce7", border: "rgba(34,197,94,0.18)", color: "#15803d" }
        : { bg: "#ffffff", border: "rgba(148,163,184,0.18)", color: "#475569" };

  return (
    <div style={{ padding: "24px", borderRadius: "24px", background: "rgba(255,255,255,0.94)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 18px 60px rgba(15,23,42,0.06)", marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "8px" }}>
            First 10 users onboarding
          </div>
          <div style={{ fontSize: "26px", fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a", marginBottom: "8px" }}>
            Run one guided workflow before you go live
          </div>
          <div style={{ fontSize: "14px", lineHeight: 1.8, color: "#475569", maxWidth: "860px" }}>
            Taskara will walk through source, action, result, and approval using the live workflow engine. Demo mode stays available when the required connector is not ready yet.
          </div>
        </div>
        <div style={{ minWidth: "260px", padding: "16px 18px", borderRadius: "18px", background: onboarding.integrationReady ? "#ecfdf5" : "#fff7ed", border: `1px solid ${onboarding.integrationReady ? "rgba(16,185,129,0.18)" : "rgba(251,146,60,0.18)"}` }}>
          <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "8px" }}>
            Required integration
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a", marginBottom: "6px" }}>
            {onboarding.requiredIntegration || "Not selected yet"}
          </div>
          <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.7 }}>
            {onboarding.integrationReady
              ? "Writeback ready for the guided run."
              : onboarding.demoAvailable
                ? "Not ready yet. You can still use demo mode for the first walkthrough."
                : onboarding.integrationStatus?.details?.[0] || "This integration still needs setup."}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", marginBottom: "18px" }}>
        {[1, 2, 3, 4, 5, 6].map((step) => {
          const toneValue = stepTone(step);
          const labels = {
            1: "Choose workflow",
            2: "Connect one tool",
            3: "Run guided workflow",
            4: "Approve or reject",
            5: "Review the result",
            6: "Run your real workflow",
          };
          return (
            <div key={step} style={{ padding: "12px 14px", borderRadius: "16px", background: toneValue.bg, border: `1px solid ${toneValue.border}`, color: toneValue.color }}>
              <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>
                Step {step}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, lineHeight: 1.5 }}>{labels[step]}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "10px" }}>
            Step 1
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {AUDIENCE_LIST.map((entry) => (
              <button
                key={entry.key}
                onClick={() => onSelectAudience(entry.key)}
                disabled={saving}
                style={{
                  padding: "10px 14px",
                  borderRadius: "999px",
                  border: `1px solid ${audience === entry.key ? "rgba(15,118,110,0.18)" : "rgba(148,163,184,0.18)"}`,
                  background: audience === entry.key ? "rgba(15,118,110,0.10)" : "#ffffff",
                  color: audience === entry.key ? "#0f766e" : "#334155",
                  fontWeight: 800,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <ActionButton label="Open integrations" onClick={onConnectIntegration} />
          <ActionButton label={saving ? "Preparing..." : "Run guided demo"} variant="primary" onClick={onRunDemo} disabled={saving} />
          {onboarding.currentStep >= 5 ? (
            <ActionButton label="Run your real workflow" variant="primary" onClick={onComplete} disabled={saving} />
          ) : null}
        </div>

        <div style={{ padding: "16px 18px", borderRadius: "18px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
            Current guided state
          </div>
          <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.8 }}>
            {onboarding.resultSummary || "Choose a workflow type, connect one required integration, or start the guided demo."}
          </div>
          {onboarding.currentStep >= 4 ? (
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "10px" }}>
              {onboarding.approvalDecision
                ? `Approval decision recorded: ${onboarding.approvalDecision}.`
                : "Use the approval buttons on the workflow item below to complete the trust check."}
            </div>
          ) : null}
          {onboarding.currentStep >= 5 ? (
            <div style={{ fontSize: "12px", color: "#0f766e", marginTop: "10px", fontWeight: 700 }}>
              Estimated manual time removed: about {onboarding.savedMinutesEstimate || 0} minutes on the first run.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WorkflowItemCard({
  item,
  onApprove,
  onReject,
  onPause,
  onResume,
  onCancel,
  onRun,
  onClaim,
  onStopFollowUp,
  onUndo,
  onFeedback,
}) {
  const [feedbackMode, setFeedbackMode] = useState("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackCategories, setFeedbackCategories] = useState([]);
  const [feedbackSaved, setFeedbackSaved] = useState("");
  const statusTone = tone[item.status] || tone.ready;
  const latestSync = getLatestSyncLog(item);
  const nextSafetyAction = getNextSafetyAction(item);
  const safetyTone = getSafetyTone(nextSafetyAction?.riskLevel || item.riskLevel || "medium");
  const toggleFeedbackCategory = (key) =>
    setFeedbackCategories((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key],
    );

  const submitFeedback = async (verdict) => {
    await onFeedback({
      verdict,
      categories: verdict === "incorrect" ? feedbackCategories : [],
      note: verdict === "incorrect" ? feedbackNote : "",
    });
    setFeedbackSaved(verdict);
    setFeedbackMode("");
    setFeedbackNote("");
    setFeedbackCategories([]);
  };

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
              {formatLabel(item.status)}
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
        <div style={{ padding: "14px", borderRadius: "16px", background: safetyTone.bg, border: `1px solid ${safetyTone.border}` }}>
          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: "8px" }}>
            Execution safety
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginBottom: "6px" }}>
            <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a" }}>
              {normalizeConfidenceScore(nextSafetyAction?.confidenceScore ?? item.confidenceScore ?? 0)}/100
            </div>
            <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: safetyTone.color }}>
              {formatLabel(nextSafetyAction?.riskLevel || item.riskLevel || "medium")} risk
            </div>
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.7, color: "#334155", marginBottom: "6px" }}>
            {nextSafetyAction?.approvalForced
              ? "Approval is forced before this step can run."
              : nextSafetyAction?.approvalRecommended
                ? "Approval is recommended before this step runs."
                : "This step is cleared for normal execution if the plan allows it."}
          </div>
          <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.6 }}>
            {(nextSafetyAction?.riskReasons || item.safetyReasons || []).slice(0, 2).join(" ")}
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
        <div style={{ padding: "14px", borderRadius: "16px", background: "#f8fafc" }}>
          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: "8px" }}>
            Linked task and outcome
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.7, color: "#334155" }}>
            {item.linkedTaskId ? `Linked task: ${item.linkedTaskId}` : "No linked task yet."}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
            {item.traceability?.outcomeSummary || "Outcome trace will appear here after execution."}
          </div>
        </div>
        <div style={{ padding: "14px", borderRadius: "16px", background: "#f8fafc" }}>
          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: "8px" }}>
            Follow-up and sync state
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.7, color: "#334155" }}>
            {item.followUp?.stopReason
              ? `Follow-up stopped: ${formatLabel(item.followUp.stopReason)}`
              : item.followUp?.active
                ? `Next follow-up ${item.followUp.nextRunAt ? new Date(item.followUp.nextRunAt).toLocaleString() : "scheduled"}`
                : "No active follow-up cadence."}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
            {latestSync
              ? `${latestSync.provider}: ${formatLabel(latestSync.status)}${latestSync.details?.reason ? ` - ${latestSync.details.reason}` : latestSync.details?.error ? ` - ${latestSync.details.error}` : ""}`
              : "No sync attempts recorded yet."}
          </div>
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
        {hasScheduledFollowUp(item) ? <ActionButton label="Stop follow-up" onClick={onStopFollowUp} /> : null}
        {(item.actionLogs || []).some((entry) => entry.status === "executed") ? (
          <ActionButton label="Undo last action" onClick={onUndo} />
        ) : null}
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

      <div style={{ marginTop: "16px", padding: "14px 16px", borderRadius: "16px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)" }}>
        <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: "8px" }}>
          Was this correct?
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: feedbackMode === "incorrect" ? "10px" : 0 }}>
          <ActionButton
            label={feedbackSaved === "correct" ? "Saved as correct" : "Yes"}
            onClick={() => submitFeedback("correct")}
            disabled={feedbackSaved === "correct"}
            variant="primary"
          />
          <ActionButton
            label={feedbackSaved === "incorrect" ? "Saved as incorrect" : "No"}
            onClick={() => setFeedbackMode("incorrect")}
            disabled={feedbackSaved === "incorrect"}
            variant="danger"
          />
        </div>
        {feedbackMode === "incorrect" ? (
          <div style={{ display: "grid", gap: "10px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {FEEDBACK_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => toggleFeedbackCategory(option.key)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "999px",
                    border: `1px solid ${feedbackCategories.includes(option.key) ? "rgba(190,24,93,0.18)" : "rgba(148,163,184,0.18)"}`,
                    background: feedbackCategories.includes(option.key) ? "#fff1f2" : "#ffffff",
                    color: feedbackCategories.includes(option.key) ? "#be123c" : "#334155",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <textarea
              value={feedbackNote}
              onChange={(event) => setFeedbackNote(event.target.value)}
              rows={2}
              placeholder="Optional note for the operator team"
              style={{
                padding: "12px 14px",
                borderRadius: "14px",
                border: "1px solid rgba(148,163,184,0.18)",
                background: "#ffffff",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <ActionButton
                label="Send feedback"
                variant="danger"
                onClick={() => submitFeedback("incorrect")}
                disabled={!feedbackCategories.length}
              />
              <ActionButton label="Dismiss" onClick={() => setFeedbackMode("")} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [audience, setAudience] = useState("startups");
  const [dashboard, setDashboard] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [planState, setPlanState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sourceType: "slack",
    title: "",
    text: "",
    autoExecute: true,
  });

  const goTo = (path) => {
    if (typeof window !== "undefined") window.location.assign(path);
  };

  const refresh = useCallback(async (nextAudience = audience) => {
    setLoading(true);
    try {
      const [data, onboardingData, planData] = await Promise.all([
        getWorkflowDashboard(nextAudience),
        getOnboardingStatus().catch(() => null),
        getCurrentPlan().catch(() => null),
      ]);
      setDashboard(data);
      setOnboarding(onboardingData?.onboarding || null);
      setPlanState(planData || null);
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
    if (onboarding?.currentStep > 1 && onboarding?.audienceType && onboarding.audienceType !== audience) {
      setAudience(onboarding.audienceType);
    }
  }, [audience, onboarding?.audienceType, onboarding?.currentStep]);

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
  const blockers = [
    ...(dashboard?.integrationCoverage || [])
      .filter((entry) => !entry.writebackReady)
      .slice(0, 3)
      .map((entry) => ({
        kind: "warning",
        title: `${entry.provider} needs attention.`,
        message: entry.details?.[0] || "Writeback is not ready for this workflow.",
      })),
    ...(dashboard?.summary?.pendingApprovals
      ? [
          {
            kind: "danger",
            title: "Approvals waiting.",
            message: `${dashboard.summary.pendingApprovals} risky action(s) are paused until an operator approves or rejects them.`,
          },
        ]
      : []),
    ...(planState?.recommendations || []).slice(0, 2).map((message) => ({
      kind: "warning",
      title: "Plan limit approaching.",
      message,
    })),
  ];
  const typicalUsage = buildTypicalUsage({
    audienceKey: audience,
    audienceInfo,
    planState,
    integrationCoverage: dashboard?.integrationCoverage || [],
  });

  const handleSelectAudience = async (nextAudience) => {
    setSaving(true);
    try {
      const data = await selectOnboardingAudience(nextAudience);
      setOnboarding(data.onboarding);
      setAudience(nextAudience);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update onboarding workflow type");
    } finally {
      setSaving(false);
    }
  };

  const handleRunDemo = async () => {
    setSaving(true);
    try {
      await runOnboardingDemo(audience);
      toast.success("Guided workflow started");
      await refresh(audience);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to run guided onboarding");
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    setSaving(true);
    try {
      const result = await completeOnboarding();
      setOnboarding(result.onboarding);
      const example = dashboard?.emptyStateExample || {};
      setForm((current) => ({
        ...current,
        sourceType: example.sourceType || current.sourceType,
        title: example.title || current.title,
        text: example.text || current.text,
      }));
      toast.success("Guided onboarding completed");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to complete onboarding");
    } finally {
      setSaving(false);
    }
  };

  const handleFeedback = async (itemId, payload) => {
    setSaving(true);
    try {
      await submitWorkflowFeedback(itemId, payload);
      toast.success(payload.verdict === "correct" ? "Feedback saved as correct" : "Feedback saved for review");
      await refresh(audience);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save workflow feedback");
      throw error;
    } finally {
      setSaving(false);
    }
  };

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
            <OnboardingPanel
              onboarding={onboarding}
              audience={audience}
              saving={saving}
              onSelectAudience={handleSelectAudience}
              onRunDemo={handleRunDemo}
              onComplete={handleCompleteOnboarding}
              onConnectIntegration={() => goTo("/integrations")}
            />

            <WarningStrip items={blockers} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px", marginBottom: "24px" }}>
              <ConfidenceCard trustSummary={dashboard.trustSummary} />
              <TypicalUsageCard items={typicalUsage} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
              <StatCard label="Active workflows" value={dashboard.summary.activeCount} detail="Execution items currently moving through the workflow." icon={<WorkflowIcon size="sm" color="#0f766e" />} />
              <StatCard label="Pending approvals" value={dashboard.summary.pendingApprovals} detail="Risky external actions waiting for operator approval." icon={<ShieldIcon size="sm" color="#0f766e" />} />
              <StatCard label="Completed this week" value={dashboard.summary.completedThisWeek} detail="Workflow items that reached a finished state in the last 7 days." icon={<CheckCircleIcon size="sm" color="#0f766e" />} />
              <StatCard label="Scheduled follow-ups" value={dashboard.summary.scheduledFollowUps} detail="Active sequences with timing controls and stop conditions." icon={<ClockIcon size="sm" color="#0f766e" />} />
            </div>

            {planState ? (
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) repeat(auto-fit, minmax(210px, 1fr))", gap: "14px", marginBottom: "24px" }}>
                <div style={{ padding: "22px", borderRadius: "24px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 18px 60px rgba(15,23,42,0.06)" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "10px" }}>
                    Current package
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: "26px", fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a", marginBottom: "6px" }}>
                        {planState.planDef?.name || "Workflow Free"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#475569", lineHeight: 1.8, maxWidth: "620px" }}>
                        Pricing is based on workflows executed, actions executed, and integrations connected. Upgrade when usage or automation depth outgrows the current package.
                      </div>
                    </div>
                    <ActionButton label="See pricing" onClick={() => goTo("/pricing")} />
                  </div>
                </div>
                <UsageMeter label="Workflows / month" usage={planState.usage?.workflowsExecuted} />
                <UsageMeter label="Actions / month" usage={planState.usage?.actionsExecuted} />
                <UsageMeter label="Integrations" usage={planState.usage?.integrationsConnected} />
              </div>
            ) : null}

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
                    onClick={() => {
                      const example = dashboard.emptyStateExample || {};
                      setForm((current) => ({
                        ...current,
                        sourceType: example.sourceType || current.sourceType,
                        title: example.title || current.title,
                        text: example.text || current.text,
                      }));
                    }}
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
                      <div key={entry.provider} style={{ padding: "12px 14px", borderRadius: "16px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{entry.provider}</div>
                          <div style={{ fontSize: "12px", fontWeight: 800, color: entry.connected ? "#0f766e" : "#b45309" }}>
                            {formatLabel(entry.status)}
                          </div>
                        </div>
                        {entry.details?.[0] ? (
                          <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.6, marginTop: "6px" }}>
                            {entry.details[0]}
                          </div>
                        ) : null}
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
                          {entry.connected ? "Connected" : "Not connected"} | {entry.ready ? "Writeback ready" : "Needs attention"}
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
                      onStopFollowUp={() => runItemAction(() => controlWorkflowItem(item._id, "stop_followup"), "Follow-up cadence stopped")}
                      onUndo={() => runItemAction(() => controlWorkflowItem(item._id, "undo_last_action"), "Last action reset for review")}
                      onFeedback={(payload) => handleFeedback(item._id, payload)}
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
                  <div style={{ marginBottom: "12px", fontSize: "13px", color: dashboard.migrationPreview?.validation?.readyToImport ? "#0f766e" : "#b45309" }}>
                    {dashboard.migrationPreview?.validation?.readyToImport
                      ? "Mapping looks safe for preview."
                      : "Preview found field warnings that need review before import."}
                  </div>
                  {(dashboard.migrationPreview?.validation?.warnings || []).length ? (
                    <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
                      {dashboard.migrationPreview.validation.warnings.map((warning) => (
                        <div key={warning} style={{ padding: "10px 12px", borderRadius: "14px", background: "#fff7ed", border: "1px solid rgba(251,146,60,0.18)", color: "#9a3412", fontSize: "12px", lineHeight: 1.6 }}>
                          {warning}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div style={{ display: "grid", gap: "10px" }}>
                    {(dashboard.migrationPreview?.mappingPreview || []).map((entry) => (
                      <div key={entry.sourceField} style={{ padding: "12px 14px", borderRadius: "16px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>{entry.sourceField}</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{entry.targetField}</div>
                      </div>
                    ))}
                    {(dashboard.migrationPreview?.mappingPreview || []).length === 0 ? (
                      <div style={{ color: "#475569", lineHeight: 1.7 }}>No migration mappings are loaded for this audience yet.</div>
                    ) : null}
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
