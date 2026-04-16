import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createAgencyContent, getAgencyAiSuggestions, getAgencyCampaigns, getAgencyClients, getAgencyContent } from "../api/agencies";
import { VerticalCard, VerticalPageLayout } from "../components/verticals/VerticalPageLayout";

export default function AgencyContentCalendarPage() {
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [ideas, setIdeas] = useState([]);

  const load = async () => {
    try {
      const [contentData, clientData, campaignData] = await Promise.all([getAgencyContent(), getAgencyClients(), getAgencyCampaigns()]);
      setItems(contentData.contentItems || []);
      setClients(clientData.clients || []);
      setCampaigns(campaignData.campaigns || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load content");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addSampleContent = async () => {
    const firstClient = clients[0];
    const firstCampaign = campaigns[0];
    if (!firstClient) return toast.error("Create a client first");
    try {
      await createAgencyContent({
        accountId: firstClient._id,
        campaignId: firstCampaign?._id || null,
        title: `Content item ${items.length + 1}`,
        channel: "linkedin",
        status: "review",
        caption: "Visible approvals, safer publishing, faster reporting.",
      });
      toast.success("Content item created");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create content");
    }
  };

  const loadIdeas = async () => {
    try {
      const result = await getAgencyAiSuggestions({
        clientName: clients[0]?.clientName || "Client",
        campaignGoal: campaigns[0]?.goal || "engagement",
        channels: campaigns[0]?.channels || ["linkedin"],
      });
      setIdeas(result.calendar || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load AI calendar suggestions");
    }
  };

  return (
    <VerticalPageLayout eyebrow="Agency Vertical" title="Content Calendar" subtitle="Draft, review, approve, schedule, and publish with trust indicators kept close to each asset." actions={<><button onClick={addSampleContent} style={{ padding: "12px 16px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)" }}>Add sample item</button><button onClick={loadIdeas} style={{ padding: "12px 16px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)" }}>AI calendar</button></>}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)", gap: "18px" }}>
        <VerticalCard title="Content pipeline" subtitle="Internal review and client approval state stay visible before any live send.">
          {(items || []).map((item) => (
            <div key={item._id} style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700 }}>{item.title}</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{item.channel} | {item.status} | approval: {item.approvalState}</div>
              <div style={{ fontSize: "13px", color: item.approvalState === "approved" ? "#15803d" : "#b45309", marginTop: "6px" }}>
                {item.approvalState === "approved" ? "Approved for scheduling" : "Review required before live publish"}
              </div>
            </div>
          ))}
        </VerticalCard>
        <VerticalCard tone="trust" title="AI calendar suggestions" subtitle="AI ideas stay draft-only until the team reviews them.">
          {(ideas || []).length ? ideas.map((idea) => (
            <div key={`${idea.title}-${idea.channel}`} style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700 }}>{idea.title}</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{idea.channel} | {idea.status}</div>
            </div>
          )) : <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Generate AI suggestions to seed the next content cycle.</div>}
        </VerticalCard>
      </div>
    </VerticalPageLayout>
  );
}
