import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createAgencyClient, getAgencyClients, getAgencyRetainers } from "../api/agencies";
import { VerticalCard, VerticalPageLayout } from "../components/verticals/VerticalPageLayout";

export default function AgencyClientsPage() {
  const [clients, setClients] = useState([]);
  const [retainers, setRetainers] = useState([]);

  const load = async () => {
    try {
      const [clientData, retainerData] = await Promise.all([getAgencyClients(), getAgencyRetainers()]);
      setClients(clientData.clients || []);
      setRetainers(retainerData.retainers || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load clients");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addSampleClient = async () => {
    try {
      await createAgencyClient({ name: `Client ${clients.length + 1}`, clientName: `Northwind ${clients.length + 1}`, status: "active", serviceTier: "Growth Retainer" });
      toast.success("Client created");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create client");
    }
  };

  return (
    <VerticalPageLayout eyebrow="Agency Vertical" title="Clients" subtitle="Client profiles, retainers, contact history, and account health in one place." actions={<button onClick={addSampleClient} style={{ padding: "12px 16px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)" }}>Add sample client</button>}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: "18px" }}>
        <VerticalCard title="Client profiles" subtitle="Each client keeps service tier, risk status, and retainer visibility close to execution.">
          {(clients || []).map((client) => (
            <div key={client._id} style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{client.clientName || client.name}</div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{client.serviceTier || "No service tier"} | {client.status}</div>
                </div>
                <div style={{ fontSize: "12px", color: client.status === "at_risk" ? "#b45309" : "#15803d", fontWeight: 700 }}>
                  {client.status}
                </div>
              </div>
            </div>
          ))}
        </VerticalCard>
        <VerticalCard tone="success" title="Retainer visibility" subtitle="Monthly package and renewal signals for account managers.">
          {(retainers || []).map((retainer) => (
            <div key={retainer._id} style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700 }}>{retainer.packageName}</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{retainer.currency} {retainer.monthlyAmount} | {retainer.status}</div>
            </div>
          ))}
        </VerticalCard>
      </div>
    </VerticalPageLayout>
  );
}
