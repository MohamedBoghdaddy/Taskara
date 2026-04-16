import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createAgencyCampaign, getAgencyCampaigns, getAgencyClients } from "../api/agencies";
import { VerticalCard, VerticalPageLayout } from "../components/verticals/VerticalPageLayout";

export default function AgencyCampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);

  const load = async () => {
    try {
      const [campaignData, clientData] = await Promise.all([getAgencyCampaigns(), getAgencyClients()]);
      setCampaigns(campaignData.campaigns || []);
      setClients(clientData.clients || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load campaigns");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addSampleCampaign = async () => {
    const firstClient = clients[0];
    if (!firstClient) return toast.error("Create a client first");
    try {
      await createAgencyCampaign({ accountId: firstClient._id, name: `Launch Sprint ${campaigns.length + 1}`, goal: "Lead generation", channels: ["linkedin", "email"], status: "active", budgetAmount: 5000 });
      toast.success("Campaign created");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create campaign");
    }
  };

  return (
    <VerticalPageLayout eyebrow="Agency Vertical" title="Campaigns" subtitle="Track campaign status, goals, budgets, and delivery risk without leaving the execution flow." actions={<button onClick={addSampleCampaign} style={{ padding: "12px 16px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)" }}>Add sample campaign</button>}>
      <VerticalCard title="Campaign execution" subtitle="Campaign status and channel mix stay visible for faster internal routing.">
        {(campaigns || []).map((campaign) => (
          <div key={campaign._id} style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700 }}>{campaign.name}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{campaign.accountId?.clientName || campaign.accountId?.name} | {campaign.status} | {(campaign.channels || []).join(", ")}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>{campaign.goal || "No goal set"} | budget: {campaign.budgetCurrency} {campaign.budgetAmount}</div>
          </div>
        ))}
      </VerticalCard>
    </VerticalPageLayout>
  );
}
