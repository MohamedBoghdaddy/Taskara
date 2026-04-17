import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../components/common/Button";
import {
  ActivityTimeline,
  AiBriefCard,
  EmptyStateCard,
  LoadingPanel,
  MetricStrip,
  StatusPill,
  StructuredList,
  VerticalCard,
  VerticalPageLayout,
} from "../components/verticals/VerticalPageLayout";
import { getAgencyAiSuggestions, getAgencyDashboard } from "../api/agencies";

const cardGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "18px",
};

export default function AgencyDashboardPage() {
  const [data, setData] = useState(null);
  const [ideaPack, setIdeaPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      setData(await getAgencyDashboard());
    } catch (loadError) {
      const message = loadError.response?.data?.error || "Failed to load agency dashboard";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const generateIdeas = async () => {
    if (!data) return;
    setGenerating(true);

    try {
      const result = await getAgencyAiSuggestions({
        clientName: data.clients?.[0]?.clientName || "Client",
        campaignGoal: data.campaigns?.[0]?.goal || "growth",
        channels: data.campaigns?.[0]?.channels || ["linkedin"],
      });
      setIdeaPack(result);
    } catch (generationError) {
      toast.error(generationError.response?.data?.error || "Failed to generate AI ideas");
    } finally {
      setGenerating(false);
    }
  };

  const pageActions = (
    <>
      <Button variant="secondary" onClick={generateIdeas} disabled={generating || loading}>
        {generating ? "Generating..." : "Generate AI brief"}
      </Button>
      <Link to="/agency/approvals" style={{ textDecoration: "none" }}>
        <Button variant="primary">Open approvals</Button>
      </Link>
    </>
  );

  if (loading) {
    return (
      <VerticalPageLayout
        eyebrow="Agency Vertical"
        title="Agency execution control center"
        subtitle="From client request to approved delivery to report. Keep trust visible, reduce wrong-send risk, and move client work faster."
        actions={pageActions}
      >
        <LoadingPanel />
      </VerticalPageLayout>
    );
  }

  if (error) {
    return (
      <VerticalPageLayout
        eyebrow="Agency Vertical"
        title="Agency execution control center"
        subtitle="From client request to approved delivery to report. Keep trust visible, reduce wrong-send risk, and move client work faster."
        actions={pageActions}
      >
        <EmptyStateCard
          title="Agency workspace data is unavailable"
          body={`${error}. Retry once the workspace and API connection are healthy.`}
          action={<Button onClick={load}>Retry dashboard</Button>}
        />
      </VerticalPageLayout>
    );
  }

  return (
    <VerticalPageLayout
      eyebrow="Agency Vertical"
      title="Agency execution control center"
      subtitle="From client request to approved delivery to report. Keep trust visible, reduce wrong-send risk, and move client work faster."
      actions={pageActions}
    >
      <MetricStrip
        items={[
          { label: "Active clients", value: data?.summary?.activeClients ?? 0, note: "Accounts actively in delivery motion" },
          { label: "Content queue", value: data?.summary?.contentQueue ?? 0, note: "Draft, review, and scheduled work" },
          { label: "Pending approvals", value: data?.summary?.pendingApprovals ?? 0, note: "Client-facing actions waiting on review" },
          { label: "Report readiness", value: data?.summary?.reportReadiness ?? 0, note: "Reports ready for review or send prep" },
        ]}
      />

      <div style={cardGridStyle}>
        <AiBriefCard brief={data?.assistantBrief} title="Operating brief" />

        <VerticalCard
          tone="trust"
          title="Trust posture"
          subtitle={data?.trustSummary?.explanation}
          actions={<StatusPill tone={data?.trustSummary?.wrongSendRisk ? "warning" : "success"}>{data?.trustSummary?.wrongSendRisk ? "Needs review" : "Stable"}</StatusPill>}
        >
          <div style={{ fontSize: "34px", fontWeight: 900, letterSpacing: "-0.05em", color: "var(--text-primary)" }}>
            {data?.trustSummary?.wrongSendRisk ?? 0}
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-secondary)", marginTop: "6px" }}>
            Outputs that still need approval coverage before they reach a client or live channel.
          </div>
        </VerticalCard>
      </div>

      <div style={{ ...cardGridStyle, marginTop: "18px" }}>
        <VerticalCard title="What needs attention" subtitle="Priority issues, blockers, and trust-sensitive items surfaced from current workspace state.">
          <StructuredList items={data?.attentionItems} emptyText="Nothing urgent needs operator attention right now." />
        </VerticalCard>

        <VerticalCard title="Recommended next actions" subtitle="High-value moves based on approvals, reporting state, and the current delivery queue.">
          <StructuredList items={data?.recommendedActions} emptyText="Taskara will recommend next actions once client work starts moving." />
        </VerticalCard>
      </div>

      <div style={{ ...cardGridStyle, marginTop: "18px" }}>
        <VerticalCard title="Campaign status" subtitle="Campaign execution and delivery risk, with channel context kept easy to scan.">
          {(data?.campaigns || []).length ? (
            (data.campaigns || []).map((campaign) => (
              <div key={campaign._id} style={{ paddingTop: "12px", borderTop: "1px solid rgba(148,163,184,0.18)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>{campaign.name}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, marginTop: "4px" }}>
                      {campaign.goal || "No campaign goal captured yet"} - {(campaign.channels || []).join(", ") || "No channels selected"}
                    </div>
                  </div>
                  <StatusPill tone={campaign.status === "at_risk" ? "danger" : campaign.status === "pending_client" ? "trust" : "info"}>
                    {campaign.status}
                  </StatusPill>
                </div>
              </div>
            ))
          ) : (
            <EmptyStateCard
              title="No campaigns yet"
              body="Create the first campaign so Taskara can track delivery momentum, approvals, and reporting state."
            />
          )}
        </VerticalCard>

        <VerticalCard title="Content queue" subtitle="Draft, review, approved, and scheduled work with visible approval state for anything client-facing.">
          {(data?.contentItems || []).length ? (
            (data.contentItems || []).slice(0, 6).map((item) => (
              <div key={item._id} style={{ paddingTop: "12px", borderTop: "1px solid rgba(148,163,184,0.18)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>{item.title}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, marginTop: "4px" }}>
                      {item.channel} - {item.status}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <StatusPill tone={item.approvalState === "approved" ? "success" : item.approvalState === "pending" ? "trust" : "neutral"}>
                      {item.approvalState || "not required"}
                    </StatusPill>
                    {item.aiConfidence ? <StatusPill tone="info">AI {item.aiConfidence}%</StatusPill> : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyStateCard
              title="No content queued"
              body="Start the content pipeline to unlock approvals, scheduling, and AI-assisted content planning."
            />
          )}
        </VerticalCard>
      </div>

      <div style={{ ...cardGridStyle, marginTop: "18px" }}>
        <VerticalCard title="Approval queue" subtitle="High-risk client-facing actions stay visible here before any live send or publish step.">
          {(data?.approvals || []).length ? (
            (data.approvals || []).slice(0, 6).map((approval) => (
              <div key={approval._id} style={{ paddingTop: "12px", borderTop: "1px solid rgba(148,163,184,0.18)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>{approval.actionLabel}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, marginTop: "4px" }}>
                      {approval.reason}
                    </div>
                  </div>
                  <StatusPill tone="trust">Approval required</StatusPill>
                </div>
              </div>
            ))
          ) : (
            <EmptyStateCard
              title="No approvals are waiting right now"
              body="When a client-facing report, scheduled post, or external send needs review, it will appear here."
            />
          )}
        </VerticalCard>

        <VerticalCard title="AI campaign kit" subtitle="Draft-only AI output that helps the team move faster without hiding review checkpoints.">
          {ideaPack ? (
            <div style={{ display: "grid", gap: "14px" }}>
              <div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {ideaPack.confidence ? <StatusPill tone="info">Confidence {ideaPack.confidence}%</StatusPill> : null}
                  <StatusPill tone="trust">Draft only</StatusPill>
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65 }}>{ideaPack.rationale}</div>
              </div>

              <div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>Ideas</div>
                <StructuredList
                  items={(ideaPack.ideas || []).map((idea, index) => ({
                    id: `idea-${index}`,
                    label: idea,
                    description: "Use as a draft prompt, not a final publish-ready asset.",
                    state: "Idea",
                    tone: "info",
                  }))}
                  emptyText="Generate AI ideas to create an initial content angle set."
                />
              </div>

              <div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>Calendar suggestions</div>
                <StructuredList
                  items={(ideaPack.calendar || []).map((entry, index) => ({
                    id: `calendar-${index}`,
                    label: entry.title,
                        description: `${entry.channel} - ${entry.theme || "Execution-ready slot suggestion"}`,
                    state: entry.status || "draft",
                    tone: entry.status === "review" ? "trust" : "info",
                  }))}
                  emptyText="Calendar ideas will appear here once generated."
                />
              </div>
            </div>
          ) : (
            <EmptyStateCard
              title="No AI brief generated yet"
              body="Generate AI ideas to get draft content angles, a suggested calendar, and review-aware next actions."
            />
          )}
        </VerticalCard>
      </div>

      <div style={{ ...cardGridStyle, marginTop: "18px" }}>
        <VerticalCard title="Recent activity" subtitle="What changed recently across campaigns, content, reporting, and approval state.">
          <ActivityTimeline items={data?.activityTimeline} emptyText="Recent execution activity will appear here once work starts moving." />
        </VerticalCard>

        <VerticalCard title="Workspace setup" subtitle="The shortest path to a complete agency execution system for this workspace.">
          {(data?.setupChecklist || []).map((entry) => (
            <div key={entry.id} style={{ paddingTop: "12px", borderTop: "1px solid rgba(148,163,184,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>{entry.label}</div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, marginTop: "4px" }}>
                    {entry.hint}
                  </div>
                </div>
                <StatusPill tone={entry.complete ? "success" : "warning"}>{entry.complete ? "Done" : "Needs setup"}</StatusPill>
              </div>
            </div>
          ))}
        </VerticalCard>
      </div>
    </VerticalPageLayout>
  );
}
