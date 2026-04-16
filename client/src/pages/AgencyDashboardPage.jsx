import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAgencyAiSuggestions, getAgencyDashboard } from "../api/agencies";
import { VerticalCard, VerticalPageLayout, MetricStrip } from "../components/verticals/VerticalPageLayout";

export default function AgencyDashboardPage() {
  const [data, setData] = useState(null);
  const [ideas, setIdeas] = useState([]);

  const load = async () => {
    try {
      setData(await getAgencyDashboard());
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load agency dashboard");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const generateIdeas = async () => {
    try {
      const result = await getAgencyAiSuggestions({
        clientName: data?.clients?.[0]?.clientName || "Client",
        campaignGoal: data?.campaigns?.[0]?.goal || "growth",
        channels: data?.campaigns?.[0]?.channels || ["linkedin"],
      });
      setIdeas(result.ideas || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to generate ideas");
    }
  };

  return (
    <VerticalPageLayout
      eyebrow="Agency Vertical"
      title="Agency execution control center"
      subtitle="From client request to approved delivery to report. Prevent wrong sends before they happen, keep approvals visible, and move reporting faster."
      actions={<button onClick={generateIdeas} style={{ padding: "12px 16px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)" }}>Generate AI ideas</button>}
    >
      <MetricStrip
        items={[
          { label: "Active clients", value: data?.summary?.activeClients ?? 0 },
          { label: "Content queue", value: data?.summary?.contentQueue ?? 0 },
          { label: "Pending approvals", value: data?.summary?.pendingApprovals ?? 0 },
          { label: "Report readiness", value: data?.summary?.reportReadiness ?? 0 },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)", gap: "18px" }}>
        <div style={{ display: "grid", gap: "18px" }}>
          <VerticalCard title="Campaign status" subtitle="Campaign execution and delivery risk.">
            {(data?.campaigns || []).map((campaign) => (
              <div key={campaign._id} style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700 }}>{campaign.name}</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{campaign.status} | {(campaign.channels || []).join(", ") || "No channels selected"}</div>
              </div>
            ))}
          </VerticalCard>

          <VerticalCard title="Content queue" subtitle="Draft -> review -> approved -> scheduled.">
            {(data?.contentItems || []).slice(0, 6).map((item) => (
              <div key={item._id} style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700 }}>{item.title}</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{item.channel} | {item.status} | approval: {item.approvalState}</div>
              </div>
            ))}
          </VerticalCard>
        </div>

        <div style={{ display: "grid", gap: "18px" }}>
          <VerticalCard tone="trust" title="Wrong-send prevention" subtitle={data?.trustSummary?.explanation}>
            <div style={{ fontSize: "28px", fontWeight: 900 }}>{data?.trustSummary?.wrongSendRisk ?? 0}</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>Outputs that still need approval coverage</div>
          </VerticalCard>

          <VerticalCard title="Pending approvals" subtitle="Visible approvals, safer publishing, faster reporting.">
            {(data?.approvals || []).slice(0, 5).map((approval) => (
              <div key={approval._id} style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700 }}>{approval.actionLabel}</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{approval.reason}</div>
              </div>
            ))}
          </VerticalCard>

          <VerticalCard title="AI content ideas" subtitle="Operational suggestions for the next content cycle.">
            {(ideas || []).length ? ideas.map((idea) => (
              <div key={idea} style={{ padding: "10px 0", borderTop: "1px solid var(--border)", fontSize: "14px", lineHeight: 1.7 }}>{idea}</div>
            )) : <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Generate suggestions from the current client and campaign context.</div>}
          </VerticalCard>
        </div>
      </div>
    </VerticalPageLayout>
  );
}
