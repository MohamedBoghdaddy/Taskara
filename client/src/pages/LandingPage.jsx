import React from "react";
import { Link } from "react-router-dom";
import {
  AnalyticsIcon,
  ArrowRight,
  CheckCircleIcon,
  PlugIcon,
  ShieldIcon,
  WorkflowIcon,
} from "../components/common/Icons";
import {
  AUDIENCE_LIST,
  CORE_ENGINE_STEPS,
  TRUST_PILLARS,
} from "../data/workflowAudienceContent";

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top right, rgba(14,165,233,0.18), transparent 32%), radial-gradient(circle at left 18%, rgba(16,185,129,0.12), transparent 28%), linear-gradient(180deg, #ffffff 0%, #f8fafc 56%, #ecfeff 100%)",
    color: "#0f172a",
  },
  shell: {
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "28px 24px 80px",
  },
  card: {
    background: "rgba(255,255,255,0.84)",
    border: "1px solid rgba(148,163,184,0.22)",
    borderRadius: "24px",
    boxShadow: "0 24px 80px rgba(15,23,42,0.08)",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "rgba(13,148,136,0.10)",
    color: "#115e59",
    border: "1px solid rgba(13,148,136,0.16)",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
};

function AudienceCard({ audience }) {
  return (
    <Link
      to={audience.slug}
      style={{
        ...styles.card,
        padding: "22px",
        display: "flex",
        flexDirection: "column",
        textDecoration: "none",
        color: "#0f172a",
        gap: "14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f766e", marginBottom: "6px" }}>{audience.label}</div>
          <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em" }}>{audience.headline}</div>
        </div>
        <ArrowRight size="sm" color="#0f766e" />
      </div>
      <div style={{ fontSize: "14px", lineHeight: 1.7, color: "#475569" }}>{audience.painPoint}</div>
      <div
        style={{
          padding: "14px 16px",
          borderRadius: "18px",
          background: "linear-gradient(135deg, rgba(15,118,110,0.07), rgba(14,165,233,0.09))",
          border: "1px solid rgba(15,118,110,0.14)",
          fontSize: "13px",
          lineHeight: 1.7,
          color: "#0f172a",
          fontWeight: 700,
        }}
      >
        {audience.hero}
      </div>
      <div style={{ display: "grid", gap: "8px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b" }}>
          Reads first
        </div>
        <div style={{ fontSize: "14px", color: "#334155" }}>{audience.readsFirst}</div>
        <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginTop: "8px" }}>
          Syncs back to
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {audience.syncTargets.map((target) => (
            <div
              key={target}
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                background: "#f8fafc",
                border: "1px solid rgba(148,163,184,0.18)",
                fontSize: "12px",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {target}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", flexWrap: "wrap", marginBottom: "30px" }}>
          <div style={{ fontSize: "24px", fontWeight: 900, letterSpacing: "-0.04em" }}>Taskara</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {AUDIENCE_LIST.map((audience) => (
              <Link key={audience.key} to={audience.slug} style={{ textDecoration: "none", color: "#475569", fontWeight: 600 }}>
                {audience.label}
              </Link>
            ))}
            <Link to="/login" style={{ textDecoration: "none", color: "#475569", fontWeight: 700 }}>
              Log in
            </Link>
            <Link
              to="/register"
              style={{
                textDecoration: "none",
                background: "#0f172a",
                color: "#fff",
                padding: "12px 18px",
                borderRadius: "999px",
                fontWeight: 800,
              }}
            >
              Start free
            </Link>
          </div>
        </header>

        <section style={{ ...styles.card, padding: "34px", marginBottom: "26px" }}>
          <div style={styles.pill}>
            <WorkflowIcon size="sm" />
            Trust-first AI execution
          </div>
          <h1 style={{ fontSize: "clamp(38px, 7vw, 74px)", lineHeight: 0.98, letterSpacing: "-0.06em", maxWidth: "940px", margin: "20px 0 16px" }}>
            Workflow automation with visible control.
            <br />
            Safe execution instead of blind automation.
          </h1>
          <p style={{ fontSize: "19px", lineHeight: 1.8, color: "#475569", maxWidth: "860px", marginBottom: "24px" }}>
            Taskara reads operational inputs, decides what should happen next, executes the safe path automatically, stops risky actions for approval, records every decision in an audit trail, and syncs outcomes back to systems of record for recruiters, startups, agencies, and real estate teams.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "22px" }}>
            <Link
              to="/register"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#0f766e",
                color: "#fff",
                padding: "15px 22px",
                borderRadius: "999px",
                fontWeight: 800,
              }}
            >
              Launch the execution hub
              <ArrowRight size="xs" />
            </Link>
            <Link
              to="/for-startups"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                border: "1px solid rgba(15,118,110,0.18)",
                color: "#0f766e",
                padding: "15px 20px",
                borderRadius: "999px",
                fontWeight: 800,
              }}
            >
              Explore audience pages
            </Link>
          </div>
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, rgba(15,23,42,0.05), rgba(14,165,233,0.10))",
              border: "1px solid rgba(148,163,184,0.18)",
              fontSize: "15px",
              lineHeight: 1.8,
              color: "#1e293b",
            }}
          >
            Source -> action -> result -> sync is still the product story, but trust sits in the middle.
            Taskara shows risk level, explains assignment, forces approval when confidence is low, and keeps every action visible before it writes back anywhere.
          </div>
        </section>

        <section style={{ marginBottom: "26px" }}>
          <div style={{ marginBottom: "16px" }}>
            <div style={styles.pill}>
              <PlugIcon size="sm" />
              Audience wedges
            </div>
            <h2 style={{ fontSize: "38px", letterSpacing: "-0.05em", margin: "18px 0 8px" }}>
              Four workflow-specific wedges on one shared engine
            </h2>
            <p style={{ fontSize: "17px", color: "#475569", lineHeight: 1.8, maxWidth: "760px" }}>
              Every audience gets its own source, action, result, and sync chain. The engine underneath stays shared: input, extract, decide, execute, track, sync.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            {AUDIENCE_LIST.map((audience) => (
              <AudienceCard key={audience.key} audience={audience} />
            ))}
          </div>
        </section>

        <section style={{ ...styles.card, padding: "28px", marginBottom: "26px" }}>
          <div style={styles.pill}>
            <WorkflowIcon size="sm" />
            Shared execution core
          </div>
          <h2 style={{ fontSize: "38px", letterSpacing: "-0.05em", margin: "18px 0 12px" }}>
            Build the engine once. Reuse it across every workflow.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
            {CORE_ENGINE_STEPS.map((step, index) => (
              <div key={step.label} style={{ padding: "18px", borderRadius: "20px", background: index % 2 ? "#ffffff" : "#f8fafc", border: "1px solid rgba(148,163,184,0.18)" }}>
                <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: "8px" }}>
                  {step.label}
                </div>
                <div style={{ fontSize: "14px", color: "#334155", lineHeight: 1.8 }}>{step.text}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "16px", marginBottom: "26px" }}>
          {TRUST_PILLARS.map((pillar) => (
            <div key={pillar.title} style={{ ...styles.card, padding: "24px" }}>
              <div style={{ display: "inline-flex", width: "42px", height: "42px", borderRadius: "14px", alignItems: "center", justifyContent: "center", background: "rgba(15,118,110,0.10)", marginBottom: "14px" }}>
                {pillar.title.includes("Approval") ? (
                  <ShieldIcon size="sm" color="#0f766e" />
                ) : pillar.title.includes("Assignment") ? (
                  <WorkflowIcon size="sm" color="#0f766e" />
                ) : pillar.title.includes("Audit") ? (
                  <AnalyticsIcon size="sm" color="#0f766e" />
                ) : (
                  <PlugIcon size="sm" color="#0f766e" />
                )}
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "10px" }}>{pillar.title}</div>
              <div style={{ fontSize: "15px", lineHeight: 1.8, color: "#475569" }}>{pillar.body}</div>
            </div>
          ))}
        </section>

        <section style={{ ...styles.card, padding: "28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(260px, 0.9fr)", gap: "20px", alignItems: "center" }}>
            <div>
              <div style={styles.pill}>
                <CheckCircleIcon size="sm" />
                Implementation-ready
              </div>
              <h2 style={{ fontSize: "38px", letterSpacing: "-0.05em", margin: "18px 0 12px" }}>
                Execution only earns trust when operators can see confidence, control, and outcome
              </h2>
              <p style={{ fontSize: "17px", lineHeight: 1.8, color: "#475569", maxWidth: "720px" }}>
                The product should feel like an execution system, not a generic AI checklist. Taskara surfaces workflow chains, risk level, approval state, action logs, assignment reasons, system sync, and audience-specific ROI in one place.
              </p>
            </div>
            <div style={{ padding: "22px", borderRadius: "24px", background: "linear-gradient(135deg, rgba(15,118,110,0.10), rgba(14,165,233,0.12))", border: "1px solid rgba(15,118,110,0.14)" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0f766e", marginBottom: "10px" }}>
                What ships now
              </div>
              <div style={{ display: "grid", gap: "12px" }}>
                {[
                  "Approvals, audit logs, and execution risk scoring on workflow actions",
                  "Structured execution items with source traceability and explainable assignment",
                  "Audience workflow templates for recruiters, startups, agencies, and real estate",
                  "Workflow analytics, launch readiness checks, and migration safety previews",
                ].map((line) => (
                  <div key={line} style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "#0f172a", lineHeight: 1.7 }}>
                    <CheckCircleIcon size="xs" color="#0f766e" style={{ marginTop: "4px", flexShrink: 0 }} />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
