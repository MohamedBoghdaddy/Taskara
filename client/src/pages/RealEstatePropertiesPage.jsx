import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createOwner, createProperty, getOwners, getProperties } from "../api/realEstate";
import { VerticalCard, VerticalPageLayout } from "../components/verticals/VerticalPageLayout";

export default function RealEstatePropertiesPage() {
  const [owners, setOwners] = useState([]);
  const [properties, setProperties] = useState([]);

  const load = async () => {
    try {
      const [ownerData, propertyData] = await Promise.all([getOwners(), getProperties()]);
      setOwners(ownerData.owners || []);
      setProperties(propertyData.properties || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load properties");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addOwnerAndProperty = async () => {
    try {
      const owner = owners[0] || (await createOwner({ name: `Owner ${owners.length + 1}`, email: `owner${owners.length + 1}@example.com` })).owner;
      await createProperty({ ownerId: owner._id, title: `Property ${properties.length + 1}`, city: "Cairo", address: "Downtown", price: 250000, bedrooms: 3, bathrooms: 2, status: "active" });
      toast.success("Property created");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create property");
    }
  };

  return (
    <VerticalPageLayout eyebrow="Real Estate Vertical" title="Properties" subtitle="Property inventory, owner records, and AI-generated listing copy in one operational surface." actions={<button onClick={addOwnerAndProperty} style={{ padding: "12px 16px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)" }}>Add sample property</button>}>
      <VerticalCard title="Property inventory" subtitle="Properties stay attached to owners and listing-ready descriptions.">
        {(properties || []).map((property) => (
          <div key={property._id} style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700 }}>{property.title}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{property.ownerId?.name} | {property.city} | {property.status}</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.7 }}>{property.aiDescription || property.description}</div>
          </div>
        ))}
      </VerticalCard>
    </VerticalPageLayout>
  );
}
