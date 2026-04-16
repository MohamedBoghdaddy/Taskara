import React from "react";

export function VerticalPageLayout({ eyebrow, title, subtitle, actions, children }) {
  return (
    <div style={{ padding: "36px 32px", maxWidth: "1260px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "24px" }}>
        <div>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, color: "#64748b", marginBottom: "10px" }}>
            {eyebrow}
          </div>
          <h1 style={{ fontSize: "36px", letterSpacing: "-0.04em", margin: "0 0 10px", color: "var(--text-primary)" }}>{title}</h1>
          <div style={{ fontSize: "15px", lineHeight: 1.8, color: "var(--text-secondary)", maxWidth: "760px" }}>{subtitle}</div>
        </div>
        {actions ? <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function VerticalCard({ title, subtitle, children, tone = "default" }) {
  const palette = tone === "trust"
    ? { background: "#fff7ed", border: "rgba(251,146,60,0.25)" }
    : tone === "success"
      ? { background: "#ecfdf5", border: "rgba(16,185,129,0.24)" }
      : { background: "var(--surface)", border: "var(--border)" };

  return (
    <div style={{ padding: "20px", borderRadius: "20px", background: palette.background, border: `1px solid ${palette.border}` }}>
      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>{title}</div>
      {subtitle ? <div style={{ fontSize: "13px", lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: "14px" }}>{subtitle}</div> : null}
      {children}
    </div>
  );
}

export function MetricStrip({ items = [] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "24px" }}>
      {items.map((item) => (
        <div key={item.label} style={{ padding: "18px", borderRadius: "18px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>
            {item.label}
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--text-primary)" }}>{item.value}</div>
          {item.note ? <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>{item.note}</div> : null}
        </div>
      ))}
    </div>
  );
}
