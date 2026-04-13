import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FlashIcon, GemFilledIcon } from './Icons';

const PLAN_NAMES = { free: 'Free', pro: 'Pro', team: 'Team', ai: 'AI' };
const PLAN_COLORS = { free: '#6b7280', pro: '#6366f1', team: '#8b5cf6', ai: '#f59e0b' };
const PLAN_NEEDED = {
  backlinks: 'pro', graph: 'pro', databases: 'pro', collaboration: 'team',
  ai: 'ai', sprints: 'team', boards: 'team', timeline: 'team',
  canvas: 'team', webhooks: 'team', automations: 'team',
  csv_export: 'team', version_history: 'pro', advanced_analytics: 'pro',
};

/**
 * UpgradePrompt — shown when a feature is gated.
 * Props:
 *   feature: string — the feature key (see PLAN_NEEDED above)
 *   compact?: boolean — inline badge vs full card
 */
export default function UpgradePrompt({ feature, compact = false }) {
  const navigate  = useNavigate();
  const needed    = PLAN_NEEDED[feature] || 'pro';
  const label     = PLAN_NAMES[needed];
  const planColor = PLAN_COLORS[needed] || '#f59e0b';

  if (compact) {
    return (
      <span
        onClick={() => navigate('/pricing')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
          background: `${planColor}22`, color: planColor,
          cursor: 'pointer', fontWeight: '600',
          border: `1px solid ${planColor}44`,
        }}
        title={`Requires ${label} plan — click to upgrade`}
      >
        <FlashIcon size="xs" /> {label}
      </span>
    );
  }

  return (
    <div style={{
      padding: '32px', textAlign: 'center',
      border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
      background: 'var(--surface)',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px', color: planColor }}>
        <GemFilledIcon size="2x" />
      </div>
      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>
        Upgrade to {label}
      </h3>
      <p style={{
        fontSize: '13px', color: 'var(--text-secondary)',
        maxWidth: '320px', margin: '0 auto 16px', lineHeight: '1.5',
      }}>
        This feature requires the <strong>{label} plan</strong>. Upgrade to unlock it
        and many more powerful features.
      </p>
      <button
        onClick={() => navigate('/pricing')}
        style={{
          padding: '10px 24px', background: planColor, color: '#fff',
          border: 'none', borderRadius: 'var(--radius)',
          fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}
      >
        View Plans <FlashIcon size="xs" />
      </button>
    </div>
  );
}
