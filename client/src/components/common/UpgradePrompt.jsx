import React from 'react';
import { useNavigate } from 'react-router-dom';

const PLAN_NAMES = { free: 'Free', pro: 'Pro', team: 'Team', ai: 'AI' };
const PLAN_NEEDED = {
  backlinks: 'pro', graph: 'pro', databases: 'pro', collaboration: 'team',
  ai: 'ai', sprints: 'team', boards: 'team', timeline: 'team',
  canvas: 'team', webhooks: 'team', automations: 'team',
  csv_export: 'team', version_history: 'pro', advanced_analytics: 'pro',
};

/**
 * UpgradePrompt — shown when a feature is gated.
 * Props:
 *   feature: string — the feature key
 *   compact?: boolean — inline badge vs full card
 */
export default function UpgradePrompt({ feature, compact = false }) {
  const navigate = useNavigate();
  const needed   = PLAN_NEEDED[feature] || 'pro';
  const label    = PLAN_NAMES[needed];

  if (compact) {
    return (
      <span
        onClick={() => navigate('/pricing')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: '#f59e0b22', color: '#f59e0b', cursor: 'pointer', fontWeight: '600', border: '1px solid #f59e0b44' }}
        title={`Requires ${label} plan — click to upgrade`}
      >
        ⚡ {label}
      </span>
    );
  }

  return (
    <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}>
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚡</div>
      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Upgrade to {label}</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', maxWidth: '320px', margin: '0 auto 16px' }}>
        This feature requires the <strong>{label} plan</strong>. Upgrade to unlock it and many more powerful features.
      </p>
      <button
        onClick={() => navigate('/pricing')}
        style={{ padding: '10px 24px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
      >
        View Plans →
      </button>
    </div>
  );
}
