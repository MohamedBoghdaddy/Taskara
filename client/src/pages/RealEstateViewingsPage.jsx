import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createViewing, getProperties, getRealEstateLeads, getViewings } from "../api/realEstate";
import { VerticalCard, VerticalPageLayout } from "../components/verticals/VerticalPageLayout";

export default function RealEstateViewingsPage() {
  const [viewings, setViewings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);

  const load = async () => {
    try {
      const [viewingData, leadData, propertyData] = await Promise.all([getViewings(), getRealEstateLeads(), getProperties()]);
      setViewings(viewingData.viewings || []);
      setLeads(leadData.leads || []);
      setProperties(propertyData.properties || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load viewings");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addSampleViewing = async () => {
    if (!leads[0] || !properties[0]) return toast.error("Create at least one lead and property first");
    try {
      await createViewing({
        leadId: leads[0]._id,
        propertyId: properties[0]._id,
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: "Share location details and confirm attendance.",
      });
      toast.success("Viewing created");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create viewing");
    }
  };

  return (
    <VerticalPageLayout eyebrow="Real Estate Vertical" title="Viewing Schedule" subtitle="Coordinate showing bookings, reminders, and no-show risk with lead and property context in one place." actions={<button onClick={addSampleViewing} style={{ padding: "12px 16px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)" }}>Add sample viewing</button>}>
      <VerticalCard title="Scheduled viewings" subtitle="Viewings stay tied to the property and lead so follow-up is easy after each appointment.">
        {(viewings || []).map((viewing) => (
          <div key={viewing._id} style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700 }}>{viewing.propertyId?.title}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{viewing.leadId?.name} | {new Date(viewing.scheduledFor).toLocaleString()} | {viewing.status}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>{viewing.notes}</div>
          </div>
        ))}
      </VerticalCard>
    </VerticalPageLayout>
  );
}
