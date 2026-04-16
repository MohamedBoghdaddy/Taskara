import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createSettlement, getDeals, getOwners, getSettlements } from "../api/realEstate";
import { VerticalCard, VerticalPageLayout } from "../components/verticals/VerticalPageLayout";

export default function RealEstateSettlementsPage() {
  const [settlements, setSettlements] = useState([]);
  const [owners, setOwners] = useState([]);
  const [deals, setDeals] = useState([]);

  const load = async () => {
    try {
      const [settlementData, ownerData, dealData] = await Promise.all([getSettlements(), getOwners(), getDeals()]);
      setSettlements(settlementData.settlements || []);
      setOwners(ownerData.owners || []);
      setDeals(dealData.deals || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load settlements");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addSampleSettlement = async () => {
    if (!owners[0] || !deals[0]) return toast.error("Create at least one owner and deal first");
    try {
      await createSettlement({
        ownerId: owners[0]._id,
        dealId: deals[0]._id,
        ownerName: owners[0].name,
        recipientName: owners[0].name,
        recipientReference: owners[0].payoutRecipients?.[0]?.reference || "Primary account",
        amount: deals[0].amount || 0,
        currency: deals[0].currency || "USD",
        status: "review",
      });
      toast.success("Settlement created");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create settlement");
    }
  };

  return (
    <VerticalPageLayout eyebrow="Real Estate Vertical" title="Owner Settlements" subtitle="Review payout recipients, settlement summaries, and release readiness before money moves." actions={<button onClick={addSampleSettlement} style={{ padding: "12px 16px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)" }}>Add sample settlement</button>}>
      <VerticalCard tone="trust" title="Settlement review queue" subtitle="Settlement releases stay review-first. Payment recipients and owner-facing summaries remain visible before release.">
        {(settlements || []).map((settlement) => (
          <div key={settlement._id} style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700 }}>{settlement.ownerId?.name}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{settlement.currency} {settlement.amount} | {settlement.status}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.7 }}>{settlement.aiSummary}</div>
          </div>
        ))}
      </VerticalCard>
    </VerticalPageLayout>
  );
}
