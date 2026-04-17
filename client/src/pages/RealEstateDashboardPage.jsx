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
import { getRealEstateAiSuggestions, getRealEstateDashboard } from "../api/realEstate";

const cardGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "18px",
};

const buildConversationContext = (data) =>
  [
    ...(data?.leads || []).slice(0, 3).map((lead) => `${lead.name} is in ${lead.currentStage} and needs ${lead.nextRequiredAction || "a follow-up"}.`),
    ...(data?.deals || []).slice(0, 2).map((deal) => `${deal.title} is ${deal.stage} with ${deal.paymentStatus} payment status.`),
    ...(data?.settlements || []).slice(0, 2).map((settlement) => `Settlement for ${settlement.ownerId?.name || "owner"} is ${settlement.status}.`),
  ].join(" ");

export default function RealEstateDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiBrief, setAiBrief] = useState("");
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      setData(await getRealEstateDashboard());
    } catch (loadError) {
      const message = loadError.response?.data?.error || "Failed to load real-estate dashboard";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const generateBrief = async () => {
    if (!data) return;
    setGenerating(true);

    try {
      const result = await getRealEstateAiSuggestions({
        mode: "conversation_summary",
        text: buildConversationContext(data),
      });
      setAiBrief(result.summary || "");
    } catch (generationError) {
      toast.error(generationError.response?.data?.error || "Failed to generate AI brief");
    } finally {
      setGenerating(false);
    }
  };

  const pageActions = (
    <>
      <Button variant="secondary" onClick={generateBrief} disabled={loading || generating}>
        {generating ? "Generating..." : "Generate AI brief"}
      </Button>
      <Link to="/real-estate/settlements" style={{ textDecoration: "none" }}>
        <Button variant="primary">Open settlements</Button>
      </Link>
    </>
  );

  if (loading) {
    return (
      <VerticalPageLayout
        eyebrow="Real Estate Vertical"
        title="Deal operations dashboard"
        subtitle="From lead to viewing to settlement without losing the thread. Keep deals moving, follow-ups visible, and money movement review-first."
        actions={pageActions}
      >
        <LoadingPanel />
      </VerticalPageLayout>
    );
  }

  if (error) {
    return (
      <VerticalPageLayout
        eyebrow="Real Estate Vertical"
        title="Deal operations dashboard"
        subtitle="From lead to viewing to settlement without losing the thread. Keep deals moving, follow-ups visible, and money movement review-first."
        actions={pageActions}
      >
        <EmptyStateCard
          title="Real-estate workspace data is unavailable"
          body={`${error}. Retry once the workspace and API connection are healthy.`}
          action={<Button onClick={load}>Retry dashboard</Button>}
        />
      </VerticalPageLayout>
    );
  }

  return (
    <VerticalPageLayout
      eyebrow="Real Estate Vertical"
      title="Deal operations dashboard"
      subtitle="From lead to viewing to settlement without losing the thread. Keep deals moving, follow-ups visible, and money movement review-first."
      actions={pageActions}
    >
      <MetricStrip
        items={[
          { label: "New leads", value: data?.summary?.newLeads ?? 0, note: "Fresh opportunities needing fast follow-up" },
          { label: "Settlements due", value: data?.summary?.settlementsDue ?? 0, note: "Payouts or releases still in review" },
          { label: "Money at risk", value: data?.summary?.moneyAtRisk ?? 0, note: "Draft or review-stage settlement value" },
          { label: "Maintenance backlog", value: data?.summary?.maintenanceBacklog ?? 0, note: "Property tasks still affecting readiness" },
        ]}
      />

      <div style={cardGridStyle}>
        <AiBriefCard brief={data?.assistantBrief} title="Operating brief" />

        <VerticalCard
          tone="trust"
          title="Settlement review"
          subtitle={data?.trustSummary?.explanation}
          actions={<StatusPill tone={data?.summary?.settlementsDue ? "trust" : "success"}>{data?.summary?.settlementsDue ? "Review open" : "Clear"}</StatusPill>}
        >
          <div style={{ fontSize: "34px", fontWeight: 900, letterSpacing: "-0.05em", color: "var(--text-primary)" }}>
            {data?.summary?.settlementsDue ?? 0}
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-secondary)", marginTop: "6px" }}>
            Owner settlements waiting for review or release before money moves.
          </div>
        </VerticalCard>
      </div>

      <div style={{ ...cardGridStyle, marginTop: "18px" }}>
        <VerticalCard title="What needs attention" subtitle="Pipeline issues, stale follow-ups, and money-sensitive actions surfaced from the current workspace.">
          <StructuredList items={data?.attentionItems} emptyText="Nothing urgent needs attention right now." />
        </VerticalCard>

        <VerticalCard title="Recommended next actions" subtitle="High-value next moves based on lead freshness, upcoming viewings, and settlement status.">
          <StructuredList items={data?.recommendedActions} emptyText="Taskara will recommend next actions once leads, deals, or settlements are in motion." />
        </VerticalCard>
      </div>

      <div style={{ ...cardGridStyle, marginTop: "18px" }}>
        <VerticalCard title="Deals by stage" subtitle="Lead flow, closing progress, and payment context without opening multiple pages.">
          {(data?.deals || []).length ? (
            (data.deals || []).map((deal) => (
              <div key={deal._id} style={{ paddingTop: "12px", borderTop: "1px solid rgba(148,163,184,0.18)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>{deal.title}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, marginTop: "4px" }}>
                      {deal.propertyId?.title || "Property pending"} - {deal.paymentStatus}
                    </div>
                  </div>
                  <StatusPill tone={deal.stage === "closing" ? "trust" : deal.stage === "under_contract" ? "warning" : "info"}>
                    {deal.stage}
                  </StatusPill>
                </div>
              </div>
            ))
          ) : (
            <EmptyStateCard
              title="No deals yet"
              body="Turn a lead into a deal to make payment status, next steps, and settlement readiness visible."
            />
          )}
        </VerticalCard>

        <VerticalCard title="Upcoming viewings" subtitle="Calendar support with lead and property context kept attached to each appointment.">
          {(data?.viewings || []).length ? (
            (data.viewings || []).map((viewing) => (
              <div key={viewing._id} style={{ paddingTop: "12px", borderTop: "1px solid rgba(148,163,184,0.18)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>{viewing.propertyId?.title || "Viewing"}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, marginTop: "4px" }}>
                      {viewing.leadId?.name || "Lead"} - {new Date(viewing.scheduledFor).toLocaleString()}
                    </div>
                  </div>
                  <StatusPill tone={viewing.status === "completed" ? "success" : "info"}>{viewing.status}</StatusPill>
                </div>
              </div>
            ))
          ) : (
            <EmptyStateCard
              title="No viewings scheduled"
              body="Scheduled showings will appear here once the lead and property are linked."
            />
          )}
        </VerticalCard>
      </div>

      <div style={{ ...cardGridStyle, marginTop: "18px" }}>
        <VerticalCard title="Lead queue" subtitle="New inquiries and next required actions, so follow-up stays visible and accountable.">
          {(data?.leads || []).length ? (
            (data.leads || []).slice(0, 6).map((lead) => (
              <div key={lead._id} style={{ paddingTop: "12px", borderTop: "1px solid rgba(148,163,184,0.18)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>{lead.name}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, marginTop: "4px" }}>
                      {lead.nextRequiredAction || "No next action yet"}
                    </div>
                  </div>
                  <StatusPill tone={lead.currentStage === "new_lead" ? "warning" : "info"}>{lead.currentStage}</StatusPill>
                </div>
              </div>
            ))
          ) : (
            <EmptyStateCard
              title="No leads yet"
              body="Once leads arrive, Taskara will surface stale follow-up, next actions, and matching opportunities here."
            />
          )}
        </VerticalCard>

        <VerticalCard title="AI deal brief" subtitle="Generate a concise operating brief from live lead, deal, and settlement context.">
          {aiBrief ? (
            <div style={{ display: "grid", gap: "10px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <StatusPill tone="info">AI summary</StatusPill>
                <StatusPill tone="trust">Review before sending</StatusPill>
              </div>
              <div style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{aiBrief}</div>
            </div>
          ) : (
            <EmptyStateCard
              title="No AI brief generated yet"
              body="Generate a structured operating brief from the current pipeline so agents can align before they act."
            />
          )}
        </VerticalCard>
      </div>

      <div style={{ ...cardGridStyle, marginTop: "18px" }}>
        <VerticalCard title="Recent activity" subtitle="Recent changes across deals, viewings, settlements, properties, and maintenance.">
          <ActivityTimeline items={data?.activityTimeline} emptyText="Recent activity will appear here once deals and viewings start moving." />
        </VerticalCard>

        <VerticalCard title="Workspace setup" subtitle="The fastest path to a complete lead-to-settlement operating flow for this workspace.">
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
