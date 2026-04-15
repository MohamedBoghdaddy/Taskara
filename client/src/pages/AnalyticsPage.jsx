import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AnalyticsIcon, CheckCircleIcon, PlugIcon, ShieldIcon, WorkflowIcon } from "../components/common/Icons";
import { getWorkflowAnalytics } from "../api/workflows";
import { AUDIENCE_LIST } from "../data/workflowAudienceContent";

function AnalyticsGroup({ audience, metrics }) {
  return (
    <div
      style={{
        padding: "24px",
        borderRadius: "24px",
        background: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 18px 60px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "6px" }}>
            {audience.label}
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.04em", color: "#0f172a" }}>
            {audience.hero}
          </div>
        </div>
        <div style={{ padding: "10px 14px", borderRadius: "999px", background: "rgba(15,118,110,0.10)", border: "1px solid rgba(15,118,110,0.16)", color: "#0f766e", fontWeight: 800, fontSize: "12px" }}>
          {audience.measuredResults.join(" | ")}
        </div>
      </div>

      {(Object.keys(metrics || {}).length === 0) ? (
        <div style={{ padding: "18px", borderRadius: "18px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.16)", color: "#64748b", lineHeight: 1.7 }}>
          No workflow data yet for this audience. Seed demo data or ingest a live workflow source to start measuring outcomes.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {Object.entries(metrics || {}).map(([key, value]) => (
            <div key={key} style={{ padding: "18px", borderRadius: "18px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.16)" }}>
              <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: "8px" }}>
                {key.replace(/_/g, " ")}
              </div>
              <div style={{ fontSize: "30px", fontWeight: 900, letterSpacing: "-0.05em", color: "#0f172a" }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getWorkflowAnalytics()
      .then((data) => {
        if (mounted) setEntries(data.entries || []);
      })
      .catch((error) => {
        toast.error(error.response?.data?.error || "Failed to load workflow analytics");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "28px",
        background:
          "radial-gradient(circle at top right, rgba(14,165,233,0.12), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
      }}
    >
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "24px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "999px", background: "rgba(15,118,110,0.10)", color: "#115e59", border: "1px solid rgba(15,118,110,0.16)", fontSize: "12px", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "14px" }}>
              <AnalyticsIcon size="sm" />
              Workflow ROI analytics
            </div>
            <h1 style={{ fontSize: "44px", lineHeight: 1.02, letterSpacing: "-0.05em", margin: "0 0 12px" }}>
              Measure the workflow, not just activity volume
            </h1>
            <p style={{ maxWidth: "880px", fontSize: "16px", lineHeight: 1.8, color: "#475569", margin: 0 }}>
              Taskara now reports audience-specific operational outcomes: recruiting response and time-to-hire, startup execution velocity, agency delivery health, and real estate response and document lag.
            </p>
          </div>
          <div style={{ padding: "20px", borderRadius: "24px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 18px 60px rgba(15,23,42,0.06)", maxWidth: "320px" }}>
            <div style={{ display: "grid", gap: "10px" }}>
              {[
                { icon: <WorkflowIcon size="sm" color="#0f766e" />, text: "Workflow-specific metrics by audience" },
                { icon: <ShieldIcon size="sm" color="#0f766e" />, text: "Trust and approval posture built into reporting" },
                { icon: <PlugIcon size="sm" color="#0f766e" />, text: "System sync health reflected in execution outcomes" },
                { icon: <CheckCircleIcon size="sm" color="#0f766e" />, text: "Clear ROI language for operations buyers" },
              ].map((item) => (
                <div key={item.text} style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "#334155", lineHeight: 1.7 }}>
                  <div style={{ marginTop: "2px" }}>{item.icon}</div>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading workflow analytics...</div>
        ) : (
          <div style={{ display: "grid", gap: "18px" }}>
            {AUDIENCE_LIST.map((audience) => {
              const entry = entries.find((item) => item.audienceType === audience.key);
              return <AnalyticsGroup key={audience.key} audience={audience} metrics={entry?.metrics || {}} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
