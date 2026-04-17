import React from "react";

const tonePalette = {
  default: {
    background: "var(--surface)",
    border: "var(--border)",
    accent: "var(--text-primary)",
  },
  trust: {
    background: "#fff7ed",
    border: "rgba(251,146,60,0.28)",
    accent: "#c2410c",
  },
  success: {
    background: "#ecfdf5",
    border: "rgba(16,185,129,0.24)",
    accent: "#047857",
  },
  info: {
    background: "#eff6ff",
    border: "rgba(59,130,246,0.22)",
    accent: "#1d4ed8",
  },
  danger: {
    background: "#fef2f2",
    border: "rgba(239,68,68,0.22)",
    accent: "#b91c1c",
  },
};

const pillPalette = {
  neutral: { background: "var(--surface-alt)", color: "var(--text-secondary)", border: "var(--border)" },
  success: { background: "#dcfce7", color: "#166534", border: "rgba(34,197,94,0.2)" },
  warning: { background: "#fef3c7", color: "#92400e", border: "rgba(245,158,11,0.22)" },
  danger: { background: "#fee2e2", color: "#b91c1c", border: "rgba(239,68,68,0.22)" },
  info: { background: "#dbeafe", color: "#1d4ed8", border: "rgba(59,130,246,0.22)" },
  trust: { background: "#fff7ed", color: "#c2410c", border: "rgba(251,146,60,0.24)" },
};

const formatDateTime = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export function VerticalPageLayout({ eyebrow, title, subtitle, actions, children }) {
  return (
    <div style={{ padding: "36px 24px 48px", maxWidth: "1280px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "20px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: "28px",
        }}
      >
        <div style={{ flex: "1 1 520px", minWidth: 0 }}>
          {eyebrow ? (
            <div
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                fontWeight: 800,
                color: "#64748b",
                marginBottom: "10px",
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              letterSpacing: "-0.05em",
              lineHeight: 1.02,
              margin: "0 0 12px",
              color: "var(--text-primary)",
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <div
              style={{
                fontSize: "15px",
                lineHeight: 1.75,
                color: "var(--text-secondary)",
                maxWidth: "780px",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>{actions}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function VerticalCard({ title, subtitle, children, tone = "default", footer, actions }) {
  const palette = tonePalette[tone] || tonePalette.default;

  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "22px",
        background: palette.background,
        border: `1px solid ${palette.border}`,
        boxShadow: tone === "default" ? "0 10px 30px rgba(15,23,42,0.04)" : "none",
      }}
    >
      {(title || subtitle || actions) ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            marginBottom: children ? "14px" : 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            {title ? (
              <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "6px" }}>
                {title}
              </div>
            ) : null}
            {subtitle ? (
              <div style={{ fontSize: "13px", lineHeight: 1.65, color: "var(--text-secondary)" }}>{subtitle}</div>
            ) : null}
          </div>
          {actions ? <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
      {footer ? <div style={{ marginTop: "16px" }}>{footer}</div> : null}
    </div>
  );
}

export function MetricStrip({ items = [] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "14px",
        marginBottom: "24px",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            padding: "18px",
            borderRadius: "18px",
            background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.92))",
            border: "1px solid var(--border)",
            boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 800,
              color: "#64748b",
              marginBottom: "8px",
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              fontSize: "30px",
              fontWeight: 900,
              letterSpacing: "-0.05em",
              color: "var(--text-primary)",
            }}
          >
            {item.value}
          </div>
          {item.note ? (
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px", lineHeight: 1.5 }}>
              {item.note}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function StatusPill({ children, tone = "neutral", style = {} }) {
  const palette = pillPalette[tone] || pillPalette.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.01em",
        background: palette.background,
        color: palette.color,
        border: `1px solid ${palette.border}`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function EmptyStateCard({ title, body, action }) {
  return (
    <div
      style={{
        padding: "18px",
        borderRadius: "18px",
        border: "1px dashed var(--border)",
        background: "rgba(248,250,252,0.7)",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>{title}</div>
      <div style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-secondary)" }}>{body}</div>
      {action ? <div style={{ marginTop: "14px" }}>{action}</div> : null}
    </div>
  );
}

export function LoadingPanel({ title = "Loading workspace context", subtitle = "Pulling the latest signals, approvals, and execution state." }) {
  return (
    <VerticalCard title={title} subtitle={subtitle}>
      <div style={{ display: "grid", gap: "12px" }}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            style={{
              height: index === 0 ? "64px" : "52px",
              borderRadius: "16px",
              background: "linear-gradient(90deg, rgba(226,232,240,0.55), rgba(241,245,249,0.95), rgba(226,232,240,0.55))",
              backgroundSize: "200% 100%",
            }}
          />
        ))}
      </div>
    </VerticalCard>
  );
}

export function StructuredList({ items = [], emptyText = "Nothing to show yet." }) {
  if (!items.length) {
    return <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{emptyText}</div>;
  }

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      {items.map((item) => (
        <div
          key={item.id || item.label || item.title}
          style={{
            paddingTop: "12px",
            borderTop: "1px solid rgba(148,163,184,0.18)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                {item.label || item.title}
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, marginTop: "4px" }}>
                {item.description || item.reason || item.meta}
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {item.state ? <StatusPill tone={item.tone || "neutral"}>{item.state}</StatusPill> : null}
              {item.requiresApproval ? <StatusPill tone="trust">Review required</StatusPill> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityTimeline({ items = [], emptyText = "No recent activity yet." }) {
  if (!items.length) {
    return <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{emptyText}</div>;
  }

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      {items.map((item) => (
        <div
          key={item.id || item.label}
          style={{
            paddingTop: "12px",
            borderTop: "1px solid rgba(148,163,184,0.18)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{item.label}</div>
              {item.meta ? (
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: "4px" }}>
                  {item.meta}
                </div>
              ) : null}
            </div>
            <div style={{ textAlign: "right", display: "grid", gap: "6px", justifyItems: "end" }}>
              {item.state ? <StatusPill tone={item.tone || "neutral"}>{item.state}</StatusPill> : null}
              {item.at ? (
                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{formatDateTime(item.at)}</div>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AiBriefCard({ brief, title = "Workspace intelligence", emptyText = "Taskara will surface a structured brief once there is enough activity to summarize." }) {
  if (!brief) {
    return (
      <VerticalCard title={title}>
        <EmptyStateCard title="No operating brief yet" body={emptyText} />
      </VerticalCard>
    );
  }

  return (
    <VerticalCard
      tone="info"
      title={title}
      subtitle={brief.summary}
      actions={
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {brief.confidence !== undefined ? <StatusPill tone="info">Confidence {brief.confidence}%</StatusPill> : null}
          {brief.mode ? <StatusPill tone="neutral">{brief.mode}</StatusPill> : null}
        </div>
      }
    >
      <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "10px" }}>{brief.headline}</div>
      {brief.sources?.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {brief.sources.map((source) => (
            <StatusPill key={source.label || source} tone="neutral">
              {source.label || source}
              {source.count !== undefined ? ` (${source.count})` : ""}
            </StatusPill>
          ))}
        </div>
      ) : null}
    </VerticalCard>
  );
}
