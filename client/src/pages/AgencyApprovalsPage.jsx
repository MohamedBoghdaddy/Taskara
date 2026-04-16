import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { approveWorkflowItem } from "../api/workflows";
import { getAgencyApprovals } from "../api/agencies";
import { VerticalCard, VerticalPageLayout } from "../components/verticals/VerticalPageLayout";

export default function AgencyApprovalsPage() {
  const [approvals, setApprovals] = useState([]);

  const load = async () => {
    try {
      const data = await getAgencyApprovals();
      setApprovals(data.approvals || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load approvals");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (executionItemId, decision) => {
    try {
      await approveWorkflowItem(executionItemId, decision);
      toast.success(`Approval ${decision}d`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update approval");
    }
  };

  return (
    <VerticalPageLayout eyebrow="Agency Vertical" title="Approval Center" subtitle="Prevent wrong sends before they happen. Review risky client-facing outputs and approve or reject them in one place.">
      <VerticalCard tone="trust" title="Pending approval queue" subtitle="High-risk actions stop here before any live client send or publish step.">
        {(approvals || []).map((approval) => (
          <div key={approval._id} style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700 }}>{approval.actionLabel}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7 }}>{approval.reason}</div>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => decide(approval.executionItemId, "approve")} style={{ padding: "10px 14px", borderRadius: "999px", border: "none", background: "#0f766e", color: "#fff" }}>Approve</button>
              <button onClick={() => decide(approval.executionItemId, "reject")} style={{ padding: "10px 14px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)" }}>Reject</button>
            </div>
          </div>
        ))}
      </VerticalCard>
    </VerticalPageLayout>
  );
}
