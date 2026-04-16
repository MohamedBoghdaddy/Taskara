import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getRealEstateDashboard } from "../api/realEstate";
import { MetricStrip, VerticalCard, VerticalPageLayout } from "../components/verticals/VerticalPageLayout";

export default function RealEstateDashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getRealEstateDashboard()
      .then(setData)
      .catch((error) => toast.error(error.response?.data?.error || "Failed to load real-estate dashboard"));
  }, []);

  return (
    <VerticalPageLayout
      eyebrow="Real Estate Vertical"
      title="Deal operations dashboard"
      subtitle="From lead to viewing to settlement without losing the thread. Keep deals moving and owner updates clear while money movement stays visible."
    >
      <MetricStrip
        items={[
          { label: "New leads", value: data?.summary?.newLeads ?? 0 },
          { label: "Settlements due", value: data?.summary?.settlementsDue ?? 0 },
          { label: "Money at risk", value: data?.summary?.moneyAtRisk ?? 0 },
          { label: "Maintenance backlog", value: data?.summary?.maintenanceBacklog ?? 0 },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)", gap: "18px" }}>
        <div style={{ display: "grid", gap: "18px" }}>
          <VerticalCard title="Deals by stage" subtitle="Lead flow, viewing progress, and closing visibility.">
            {(data?.deals || []).map((deal) => (
              <div key={deal._id} style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700 }}>{deal.title}</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{deal.stage} | {deal.paymentStatus} | {deal.propertyId?.title}</div>
              </div>
            ))}
          </VerticalCard>
          <VerticalCard title="Upcoming viewings" subtitle="Calendar support with visible schedule context.">
            {(data?.viewings || []).map((viewing) => (
              <div key={viewing._id} style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700 }}>{viewing.propertyId?.title}</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{viewing.leadId?.name} | {new Date(viewing.scheduledFor).toLocaleString()} | {viewing.status}</div>
              </div>
            ))}
          </VerticalCard>
        </div>
        <div style={{ display: "grid", gap: "18px" }}>
          <VerticalCard tone="trust" title="Settlement review" subtitle={data?.trustSummary?.explanation}>
            <div style={{ fontSize: "28px", fontWeight: 900 }}>{data?.summary?.settlementsDue ?? 0}</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>Owner settlements waiting for review or release</div>
          </VerticalCard>
          <VerticalCard title="Leads" subtitle="New inquiries and follow-up context.">
            {(data?.leads || []).slice(0, 6).map((lead) => (
              <div key={lead._id} style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700 }}>{lead.name}</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{lead.currentStage} | {lead.nextRequiredAction || "No next action yet"}</div>
              </div>
            ))}
          </VerticalCard>
        </div>
      </div>
    </VerticalPageLayout>
  );
}
