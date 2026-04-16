import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createAgencyReport, getAgencyClients, getAgencyReports } from "../api/agencies";
import { VerticalCard, VerticalPageLayout } from "../components/verticals/VerticalPageLayout";

export default function AgencyReportsPage() {
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);

  const load = async () => {
    try {
      const [reportData, clientData] = await Promise.all([getAgencyReports(), getAgencyClients()]);
      setReports(reportData.reports || []);
      setClients(clientData.clients || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load reports");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addSampleReport = async () => {
    const firstClient = clients[0];
    if (!firstClient) return toast.error("Create a client first");
    try {
      await createAgencyReport({
        accountId: firstClient._id,
        title: `Performance report ${reports.length + 1}`,
        metrics: { leads: 42, conversions: 7, spend: 1200, ctr: "3.8%" },
        recipientEmails: ["client@example.com"],
      });
      toast.success("Report created");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create report");
    }
  };

  return (
    <VerticalPageLayout eyebrow="Agency Vertical" title="Reports" subtitle="AI-generated summaries, report readiness, and external-recipient review status in one reporting surface." actions={<button onClick={addSampleReport} style={{ padding: "12px 16px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)" }}>Create sample report</button>}>
      <VerticalCard title="Client reporting" subtitle="Charts and shareable reporting stay attached to recipient review state.">
        {(reports || []).map((report) => (
          <div key={report._id} style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700 }}>{report.title}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{report.accountId?.clientName || report.accountId?.name} | {report.status} | AI confidence: {report.aiConfidence || "n/a"}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.7 }}>{report.summary}</div>
          </div>
        ))}
      </VerticalCard>
    </VerticalPageLayout>
  );
}
