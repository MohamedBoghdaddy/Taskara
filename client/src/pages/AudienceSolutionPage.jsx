import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircleIcon, PlugIcon, ShieldIcon, WorkflowIcon } from "../components/common/Icons";
import { AUDIENCE_CONTENT } from "../data/workflowAudienceContent";

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(14,165,233,0.14), transparent 34%), linear-gradient(180deg, #ffffff 0%, #f8fafc 62%, #ecfeff 100%)",
    color: "#0f172a",
  },
  shell: {
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "32px 24px 80px",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "rgba(14,165,233,0.10)",
    color: "#0f766e",
    border: "1px solid rgba(13,148,136,0.18)",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  card: {
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(148,163,184,0.22)",
    borderRadius: "22px",
    boxShadow: "0 22px 70px rgba(15,23,42,0.08)",
  },
};

function QuestionCard({ label, value }) {
  return (
    <div style={{ ...styles.card, padding: "20px" }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#64748b",
          marginBottom: "10px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "15px", lineHeight: 1.7, color: "#1e293b" }}>{value}</div>
    </div>
  );
}

export default function AudienceSolutionPage({ audienceKey }) {
  const audience = AUDIENCE_CONTENT[audienceKey];

  if (!audience) {
    return (
      <div style={styles.page}>
        <div style={styles.shell}>
          <h1>Audience page not found.</h1>
          <Link to="/">Back to Taskara</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", flexWrap: "wrap", marginBottom: "34px" }}>
          <Link to="/" style={{ textDecoration: "none", color: "#0f172a", fontWeight: 800, fontSize: "22px", letterSpacing: "-0.03em" }}>
            Taskara
          </Link>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link to="/login" style={{ textDecoration: "none", color: "#334155", fontWeight: 600 }}>Log in</Link>
            <Link
              to="/register"
              style={{
                textDecoration: "none",
                background: "#0f766e",
                color: "#fff",
                padding: "12px 18px",
                borderRadius: "999px",
                fontWeight: 700,
              }}
            >
              Start free
            </Link>
          </div>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: "24px", alignItems: "stretch", marginBottom: "32px" }}>
          <div style={{ ...styles.card, padding: "30px" }}>
            <div style={styles.pill}>
              <WorkflowIcon size="sm" />
              {audience.label}
            </div>
            <h1 style={{ fontSize: "clamp(34px, 6vw, 64px)", lineHeight: 1.02, letterSpacing: "-0.05em", margin: "18px 0 16px" }}>
              {audience.headline}
            </h1>
            <p style={{ fontSize: "18px", lineHeight: 1.7, color: "#475569", maxWidth: "700px", marginBottom: "26px" }}>
              {audience.subheadline}
            </p>
            <div
              style={{
                padding: "18px 20px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, rgba(15,118,110,0.08), rgba(14,165,233,0.1))",
                border: "1px solid rgba(15,118,110,0.14)",
                fontWeight: 700,
                color: "#115e59",
                marginBottom: "24px",
              }}
            >
              {audience.hero}
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link
                to="/register"
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#0f172a",
                  color: "#fff",
                  padding: "14px 22px",
                  borderRadius: "999px",
                  fontWeight: 700,
                }}
              >
                Launch this workflow
                <ArrowRight size="xs" />
              </Link>
              <Link
                to="/dashboard"
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#0f766e",
                  padding: "14px 20px",
                  borderRadius: "999px",
                  border: "1px solid rgba(15,118,110,0.18)",
                  fontWeight: 700,
                }}
              >
                See the execution hub
              </Link>
            </div>
          </div>

          <div style={{ ...styles.card, padding: "26px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: "14px" }}>
              Workflow Snapshot
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              {audience.metricsPreview.map((metric) => (
                <div key={metric.label} style={{ padding: "16px", borderRadius: "18px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.18)" }}>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "6px" }}>{metric.label}</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: "4px" }}>{metric.value}</div>
                  <div style={{ fontSize: "13px", color: "#475569" }}>{metric.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <QuestionCard label="What They Hate Most" value={audience.fiveQuestions.hateMost} />
          <QuestionCard label="What Taskara Reads First" value={audience.fiveQuestions.readsFrom} />
          <QuestionCard label="What Happens Automatically" value={audience.fiveQuestions.automaticAction} />
          <QuestionCard label="What Gets Measured" value={audience.fiveQuestions.measuredResult} />
          <QuestionCard label="What Must Sync" value={audience.fiveQuestions.mustSync} />
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "24px", marginBottom: "32px" }}>
          <div style={{ ...styles.card, padding: "26px" }}>
            <div style={{ ...styles.pill, marginBottom: "16px" }}>
              <CheckCircleIcon size="sm" />
              Automated Actions
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              {audience.automaticActions.map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(15,118,110,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                    <CheckCircleIcon size="xs" color="#0f766e" />
                  </div>
                  <div style={{ lineHeight: 1.7, color: "#1e293b" }}>{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...styles.card, padding: "26px" }}>
            <div style={{ ...styles.pill, marginBottom: "16px" }}>
              <ShieldIcon size="sm" />
              Trust Layer
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              {audience.trustControls.map((item) => (
                <div key={item} style={{ padding: "14px 16px", borderRadius: "16px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.18)", color: "#1e293b", lineHeight: 1.7 }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ ...styles.card, padding: "26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "18px" }}>
            <div>
              <div style={{ ...styles.pill, marginBottom: "12px" }}>
                <PlugIcon size="sm" />
                Systems And Sync
              </div>
              <h2 style={{ fontSize: "32px", letterSpacing: "-0.04em", margin: 0 }}>The workflow engine stays anchored to systems of record</h2>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
            {audience.syncTargets.map((target) => (
              <div key={target} style={{ padding: "10px 14px", borderRadius: "999px", border: "1px solid rgba(15,118,110,0.18)", background: "rgba(15,118,110,0.08)", color: "#0f766e", fontWeight: 700, fontSize: "13px" }}>
                {target}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
            {audience.workflowChain.map((step, index) => (
              <div key={step} style={{ padding: "16px", borderRadius: "18px", background: index % 2 ? "#f8fafc" : "#ffffff", border: "1px solid rgba(148,163,184,0.18)" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
                  {step}
                </div>
                <div style={{ fontSize: "14px", lineHeight: 1.7, color: "#334155" }}>
                  {index === 0
                    ? audience.readsFirst
                    : index === audience.workflowChain.length - 1
                      ? audience.syncTargets.join(", ")
                      : audience.automaticActions[index - 1] || audience.automaticActions[0]}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
