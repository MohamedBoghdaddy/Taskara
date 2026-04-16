import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getRealEstateAiSuggestions, getRealEstateLeads } from "../api/realEstate";
import { VerticalCard, VerticalPageLayout } from "../components/verticals/VerticalPageLayout";

export default function RealEstateLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState("");

  const load = async () => {
    try {
      const data = await getRealEstateLeads();
      setLeads(data.leads || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load leads");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const summarizeLead = async () => {
    if (!leads[0]) return toast.error("No leads available");
    try {
      const result = await getRealEstateAiSuggestions({
        mode: "conversation_summary",
        text: `${leads[0].name} is in stage ${leads[0].currentStage}. Next action: ${leads[0].nextRequiredAction || "Follow up."}`,
      });
      setSummary(result.summary || "");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to summarize lead");
    }
  };

  return (
    <VerticalPageLayout eyebrow="Real Estate Vertical" title="Leads" subtitle="Lead capture, assignment context, and follow-up risk in one pipeline." actions={<button onClick={summarizeLead} style={{ padding: "12px 16px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)" }}>Summarize first lead</button>}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: "18px" }}>
        <VerticalCard title="Lead pipeline" subtitle="Lead stage and next required action stay visible so follow-up does not stall.">
          {(leads || []).map((lead) => (
            <div key={lead._id} style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700 }}>{lead.name}</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{lead.currentStage} | {lead.email || lead.phone || "No contact yet"}</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>{lead.nextRequiredAction || "Next action not set"}</div>
            </div>
          ))}
        </VerticalCard>
        <VerticalCard tone="trust" title="AI conversation summary" subtitle="WhatsApp-style updates and summaries stay review-only until the team decides.">
          <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.8 }}>{summary || "Generate a short conversation summary for the first lead in the queue."}</div>
        </VerticalCard>
      </div>
    </VerticalPageLayout>
  );
}
