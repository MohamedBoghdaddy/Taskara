import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentPlan, upgradePlan } from '../api/index';
import toast from 'react-hot-toast';
import FeatureGuide from '../components/common/FeatureGuide';
import {
  GemFilledIcon, CheckIcon, CloseIcon, CrownIcon, RocketIcon,
  UsersIcon, BrainIcon, StarFilledIcon,
} from '../components/common/Icons';

const PLANS = [
  {
    key: 'free',
    name: 'Personal Starter',
    price: 0,
    period: 'forever',
    tagline: 'Get started for free',
    color: '#6b7280',
    icon: <StarFilledIcon color="#6b7280" />,
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
    icon: <RocketIcon color="#6366f1" />,
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
    icon: <UsersIcon color="#8b5cf6" />,
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
    icon: <BrainIcon color="#f59e0b" />,
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
  const navigate  = useNavigate();
  const [current,   setCurrent]   = useState(null);
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
      {/* How to use guide */}
      <FeatureGuide
        storageKey="pricing-guide"
        title="Plans & Pricing"
        icon={<GemFilledIcon />}
        description="Choose the plan that matches your workflow. You can upgrade or downgrade anytime. All plans include SSL encryption and regular backups."
        steps={[
          { icon: <StarFilledIcon />, title: 'Start Free',    body: 'The Free plan includes all core features with no credit card required.' },
          { icon: <RocketIcon />,    title: 'Go Pro',         body: 'Unlock backlinks, graph, analytics, and advanced Pomodoro stats.' },
          { icon: <UsersIcon />,     title: 'Team up',        body: 'Collaboration plan adds shared workspaces, boards, sprints, and automations.' },
          { icon: <BrainIcon />,     title: 'Add AI',         body: 'The AI plan adds summaries, auto-planning, smart search, and your second brain.' },
        ]}
        tips={[
          'Upgrade mid-month — charges are prorated',
          'Teams are billed per seat per month',
          'Annual billing saves up to 20%',
          'All data is preserved if you downgrade',
        ]}
        accentColor="#f59e0b"
      />

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Simple, Transparent Pricing</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Start free. Upgrade when you need more power.</p>
        {current && (
          <p style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '6px' }}>
            Your current plan: <strong>{PLANS.find(p => p.key === current)?.name}</strong>
          </p>
        )}
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
              onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.boxShadow = `0 4px 20px ${plan.color}33`; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Badge */}
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  background: plan.color, color: '#fff', fontSize: '11px', fontWeight: '700',
                  padding: '3px 12px', borderRadius: '99px', whiteSpace: 'nowrap',
                }}>
                  {plan.badge}
                </div>
              )}
              {isCurrent && (
                <div style={{
                  position: 'absolute', top: '-12px', right: '16px',
                  background: 'var(--success)', color: '#fff',
                  fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '99px',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <CheckIcon size="xs" /> Current
                </div>
              )}

              {/* Plan header */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: plan.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {plan.icon} {plan.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)' }}>${plan.price}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/{plan.period}</span>
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
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                {upgrading === plan.key ? 'Upgrading…' : isCurrent ? 'Current Plan' : plan.price === 0 ? 'Get Started Free' : `Upgrade to ${plan.name}`}
              </button>

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <CheckIcon size="xs" style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                    <span>{f}</span>
                  </div>
                ))}
                {plan.missing.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', opacity: 0.6 }}>
                    <CloseIcon size="xs" style={{ flexShrink: 0, marginTop: '2px' }} />
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
