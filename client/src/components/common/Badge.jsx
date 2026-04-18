import React from "react";
const colors = {
  todo: { bg: "#F3F4F6", text: "#000000" },
  in_progress: { bg: "#DBEAFE", text: "#000000" },
  done: { bg: "#DCFCE7", text: "#000000" },
  blocked: { bg: "#FEE2E2", text: "#000000" },
  inbox: { bg: "#F3F4F6", text: "#000000" },
  archived: { bg: "#F3F4F6", text: "#000000" },
  high: { bg: "#FEE2E2", text: "#000000" },
  urgent: { bg: "#FEF3C7", text: "#000000" },
  medium: { bg: "#DBEAFE", text: "#000000" },
  low: { bg: "#F3F4F6", text: "#000000" },
};
export default function Badge({ label, type, style = {} }) {
  const c = colors[type] || {
    bg: "var(--surface-alt)",
    text: "var(--text-secondary)",
  };
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: "600",
        background: c.bg,
        color: c.text,
        textTransform: "capitalize",
        ...style,
      }}
    >
      {label || type}
    </span>
  );
}
