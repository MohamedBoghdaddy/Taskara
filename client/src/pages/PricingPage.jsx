import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentPlan, upgradePlan } from '../api/index';
import toast from 'react-hot-toast';

const PLANS = [
  {
    key: 'free',
    name: 'Personal Starter',
    price: 0,
    period: 'forever',
    tagline: 'Get started for free',
    color: '#6b7280',
    features: [
      'Inbox & capture',
      'Basic notes & tasks',
      'Today page',
      'Pomodoro timer',
      'Tags & search',
      'Daily notes',
      'Basic reminders',
      'Limited templates',
      '1 project, 1 workspace',
      '100 MB storage',
    ],
    missing: ['Backlinks & graph', 'Databases', 'Collaboration', 'AI features', 'Boards & Sprints'],
  },
  {
    key: 'pro',
    name: 'Power User',
    price: 10,
    period: 'month',
    tagline: 'For serious individuals',
    color: '#6366f1',
    badge: 'Most popular',
    features: [
      'Everything in Free',
      'Backlinks + knowledge graph',
      'Unlimited projects',
      'Advanced analytics & focus reports',
      'Calendar view',
      'Databases (limited)',
      'Full templates',
      'Advanced Pomodoro stats & streaks',
      'Focus score & burnout detection',
      '3 workspaces, 5 GB storage',
    ],
    missing: ['Collaboration / team features', 'Boards & Sprints', 'AI features'],
  },
  {
    key: 'team',
    name: 'Collaboration',
    price: 18,
    period: 'user/month',
    tagline: 'For startups & small teams',
    color: '#8b5cf6',
    features: [
      'Everything in Pro',
      'Shared workspaces & teamspaces',
      'Role-based permissions',
      'Kanban boards & Sprints',
      'Full databases & custom views',
      'Automation rules engine',
      'Webhooks & integrations',
      'CSV export',
      'Team analytics',
      'Unlimited workspaces, 20 GB storage',
    ],
    missing: ['AI features (add AI plan)'],
  },
  {
    key: 'ai',
    name: 'Intelligence Layer',
    price: 25,
    period: 'month',
    tagline: 'Your AI-powered second brain',
    color: '#f59e0b',
    badge: 'Best value',
    features: [
      'Everything in Pro or Team',
      'AI note summaries & rewriting',
      'AI task extraction from notes',
      'Auto daily planning',
      'Smart prioritization',
      'Semantic search across workspace',
      'Burnout detection & focus insights',
      'Meeting notes → tasks',
      'Voice → task capture',
      'Knowledge Q&A chatbot',
      'Auto-linking & backlinks',
      'Unlimited storage',
    ],
    missing: [],
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(null);
  const [upgrading, setUpgrading] = useState(null);

  useEffect(() => {
    getCurrentPlan()
      .then(d => setCurrent(d.subscription?.plan || 'free'))
      .catch(() => setCurrent('free'));
  }, []);

  const handleUpgrade = async (planKey) => {
    if (planKey === current) return;
    setUpgrading(planKey);
    try {
      await upgradePlan(planKey);
      setCurrent(planKey);
      toast.success(`Upgraded to ${PLANS.find(p => p.key === planKey)?.name}!`);
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upgrade failed');
    } finally { setUpgrading(null); }
  };

  return (
    <div style={{ padding: '40px 32px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Simple, Transparent Pricing</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Start free. Upgrade when you need more power.</p>
        {current && <p style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '6px' }}>Your current plan: <strong>{PLANS.find(p => p.key === current)?.name}</strong></p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {PLANS.map(plan => {
          const isCurrent = current === plan.key;
          return (
            <div
              key={plan.key}
              style={{
                background: 'var(--surface)',
                border: `2px solid ${isCurrent ? plan.color : 'var(--border)'}`,
                borderRadius: '12px',
                padding: '24px',
                position: 'relative',
                transition: 'box-shadow 0.2s',
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: '11px', fontWeight: '700', padding: '3px 12px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
                  {plan.badge}
                </div>
              )}
              {isCurrent && (
                <div style={{ position: 'absolute', top: '-12px', right: '16px', background: 'var(--success)', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '99px' }}>
                  Current
                </div>
              )}

              {/* Plan header */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: plan.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)' }}>${plan.price}</span>
                  {plan.price > 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/{plan.period}</span>}
                  {plan.price === 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/{plan.period}</span>}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{plan.tagline}</div>
              </div>

              {/* CTA */}
              <button
                onClick={() => handleUpgrade(plan.key)}
                disabled={isCurrent || upgrading === plan.key}
                style={{
                  width: '100%', padding: '10px', borderRadius: 'var(--radius)',
                  border: 'none', cursor: isCurrent ? 'default' : 'pointer',
                  background: isCurrent ? 'var(--surface-alt)' : plan.color,
                  color: isCurrent ? 'var(--text-muted)' : '#fff',
                  fontWeight: '600', fontSize: '14px', marginBottom: '20px',
                  opacity: upgrading && upgrading !== plan.key ? 0.7 : 1,
                }}
              >
                {upgrading === plan.key ? 'Upgrading…' : isCurrent ? 'Current Plan' : plan.price === 0 ? 'Get Started Free' : `Upgrade to ${plan.name}`}
              </button>

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--success)', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
                {plan.missing.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', opacity: 0.6 }}>
                    <span style={{ flexShrink: 0, marginTop: '1px' }}>✗</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '13px', color: 'var(--text-muted)' }}>
        All plans include SSL encryption, regular backups, and priority support. Cancel anytime.
      </p>
    </div>
  );
}
