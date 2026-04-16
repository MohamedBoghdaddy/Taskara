import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createDeal, getDeals, getOwners, getProperties, getRealEstateLeads } from "../api/realEstate";
import { VerticalCard, VerticalPageLayout } from "../components/verticals/VerticalPageLayout";

export default function RealEstateDealsPage() {
  const [deals, setDeals] = useState([]);
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [owners, setOwners] = useState([]);

  const load = async () => {
    try {
      const [dealData, leadData, propertyData, ownerData] = await Promise.all([getDeals(), getRealEstateLeads(), getProperties(), getOwners()]);
      setDeals(dealData.deals || []);
      setLeads(leadData.leads || []);
      setProperties(propertyData.properties || []);
      setOwners(ownerData.owners || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load deals");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addSampleDeal = async () => {
    if (!leads[0] || !properties[0] || !owners[0]) return toast.error("Create at least one lead, property, and owner first");
    try {
      await createDeal({
        leadId: leads[0]._id,
        propertyId: properties[0]._id,
        ownerId: owners[0]._id,
        title: `Deal ${deals.length + 1}`,
        stage: "viewing",
        amount: properties[0].price || 0,
        nextAction: "Confirm viewing and document checklist",
      });
      toast.success("Deal created");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create deal");
    }
  };

  return (
    <VerticalPageLayout eyebrow="Real Estate Vertical" title="Deals" subtitle="Track deal stages, money status, and next follow-up without losing lead context." actions={<button onClick={addSampleDeal} style={{ padding: "12px 16px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)" }}>Add sample deal</button>}>
      <VerticalCard title="Deal pipeline" subtitle="Deal stages and payment status stay visible from viewing to settlement.">
        {(deals || []).map((deal) => (
          <div key={deal._id} style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700 }}>{deal.title}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{deal.propertyId?.title} | {deal.stage} | {deal.paymentStatus}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>{deal.nextAction}</div>
          </div>
        ))}
      </VerticalCard>
    </VerticalPageLayout>
  );
}
