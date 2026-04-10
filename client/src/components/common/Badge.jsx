import React from 'react';
const colors = {
  todo: { bg: '#F3F4F6', text: '#6B7280' },
  in_progress: { bg: '#DBEAFE', text: '#1D4ED8' },
  done: { bg: '#DCFCE7', text: '#16A34A' },
  blocked: { bg: '#FEE2E2', text: '#DC2626' },
  inbox: { bg: '#F3F4F6', text: '#6B7280' },
  archived: { bg: '#F3F4F6', text: '#9CA3AF' },
  high: { bg: '#FEE2E2', text: '#DC2626' },
  urgent: { bg: '#FEF3C7', text: '#D97706' },
  medium: { bg: '#DBEAFE', text: '#1D4ED8' },
  low: { bg: '#F3F4F6', text: '#6B7280' },
};
export default function Badge({ label, type, style = {} }) {
  const c = colors[type] || { bg: 'var(--surface-alt)', text: 'var(--text-secondary)' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: c.bg, color: c.text, textTransform: 'capitalize', ...style }}>
      {label || type}
    </span>
  );
}
