import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import FeatureGuide from '../components/common/FeatureGuide';
import { getAllPlans, getCurrentPlan, upgradePlan } from '../api';
import {
  BrainIcon,
  CheckIcon,
  GemFilledIcon,
  RocketIcon,
  StarFilledIcon,
  TrophyIcon,
  UsersIcon,
  WorkflowIcon,
} from '../components/common/Icons';

const PLAN_COPY = {
  free: {
    tagline: 'For a first operator validating one workflow wedge',
    badge: 'Start here',
    icon: <StarFilledIcon color="#64748b" />,
    color: '#64748b',
    highlights: [
      'Manual approval required on risky actions',
      'One connected system',
      'Guided onboarding and demo mode',
      'Basic workflow analytics',
    ],
  },
  pro: {
    tagline: 'For a single team running live execution every week',
    badge: 'Best for first paying teams',
    icon: <RocketIcon color="#0f766e" />,
    color: '#0f766e',
    highlights: [
      'Auto-execution for safe actions',
      'Basic connector writeback',
      'Workflow usage alerts',
      'Operational analytics',
    ],
  },
  team: {
    tagline: 'For multi-user operations with approvals and routing depth',
    badge: 'Most common expansion',
    icon: <UsersIcon color="#2563eb" />,
    color: '#2563eb',
    highlights: [
      'Multi-user workflow ownership',
      'Higher integration depth',
      'Priority execution and analytics',
      'Team routing and override visibility',
    ],
  },
  enterprise: {
    tagline: 'For high-volume operations with custom controls and support',
    badge: 'Custom rollout',
    icon: <BrainIcon color="#7c3aed" />,
    color: '#7c3aed',
    highlights: [
      'Unlimited workflow volume',
      'Advanced integration programs',
      'Custom controls and support',
      'Enterprise rollout readiness',
    ],
  },
};

function UsageCard({ label, counter }) {
  if (!counter) return null;
  const percent = counter.unlimited ? 0 : Math.min(counter.percent || 0, 100);
  return (
    <div style={{ padding: '18px', borderRadius: '18px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
        {counter.used}
        {!counter.unlimited ? <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>/ {counter.limit}</span> : null}
      </div>
      {!counter.unlimited ? (
        <>
          <div style={{ height: '8px', borderRadius: '999px', background: 'var(--surface-alt)', overflow: 'hidden' }}>
            <div style={{ width: `${percent}%`, height: '100%', background: percent >= 90 ? 'var(--error)' : percent >= 75 ? '#f59e0b' : 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>{counter.remaining} remaining this month</div>
        </>
      ) : (
        <div style={{ fontSize: '12px', color: 'var(--success)' }}>Unlimited on this plan</div>
      )}
    </div>
  );
}

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [currentPlanDef, setCurrentPlanDef] = useState(null);
  const [usage, setUsage] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [upgrading, setUpgrading] = useState('');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const goTo = (path) => {
    if (typeof window !== 'undefined') window.location.assign(path);
  };

  useEffect(() => {
    Promise.all([getAllPlans(), getCurrentPlan()])
      .then(([plansData, currentData]) => {
        setPlans(plansData.plans || []);
        setCurrentPlan(currentData.effectivePlan || currentData.subscription?.plan || 'free');
        setCurrentPlanDef(currentData.planDef || null);
        setUsage(currentData.usage || null);
        setRecommendations(currentData.recommendations || []);
        setIsPlatformAdmin(Boolean(currentData.isPlatformAdmin));
      })
      .catch((error) => {
        toast.error(error.response?.data?.error || 'Failed to load pricing');
      });
  }, []);

  const orderedPlans = useMemo(
    () => [...plans].sort((left, right) => {
      const order = { free: 0, pro: 1, team: 2, enterprise: 3 };
      return (order[left.key] ?? 99) - (order[right.key] ?? 99);
    }),
    [plans],
  );

  const handleUpgrade = async (planKey) => {
    if (planKey === currentPlan || isPlatformAdmin) return;
    setUpgrading(planKey);
    try {
      const data = await upgradePlan(planKey);
      setCurrentPlan(data.effectivePlan || data.subscription?.plan || planKey);
      setCurrentPlanDef(data.planDef || null);
      setUsage(data.usage || usage);
      toast.success(`Plan updated to ${data.planDef?.name || planKey}`);
      setTimeout(() => goTo('/dashboard'), 1200);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Plan update failed');
    } finally {
      setUpgrading('');
    }
  };

  return (
    <div style={{ padding: '40px 32px', maxWidth: '1180px', margin: '0 auto' }}>
      <FeatureGuide
        storageKey="workflow-pricing-guide"
        title="Workflow Packaging"
        icon={<GemFilledIcon />}
        description="Taskara pricing is tied to workflows executed, actions executed, and integrations connected. Packaging follows the operational load the workflow engine carries for each workspace."
        steps={[
          { icon: <WorkflowIcon />, title: 'Count workflows', body: 'Each workflow run consumes monthly workflow capacity.' },
          { icon: <TrophyIcon />, title: 'Count actions', body: 'Executed actions track the real work Taskara completes.' },
          { icon: <UsersIcon />, title: 'Count integrations', body: 'Connected systems are limited by plan depth, not just seat count.' },
          { icon: <RocketIcon />, title: 'Upgrade on usage', body: 'Upgrade prompts appear when your current workflow volume approaches plan limits.' },
        ]}
        tips={[
          'Free is for guided setup and a small monthly volume',
          'Pro unlocks live auto-execution for safe actions',
          'Team is the first multi-user operating tier',
          'Enterprise is for custom rollout and support',
        ]}
        accentColor="#0f766e"
      />

      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: '800', marginBottom: '10px' }}>Workflow-based pricing</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 auto', maxWidth: '760px', lineHeight: '1.8' }}>
          Plans scale with the real operational work Taskara executes: workflow runs, actions completed, and integrations connected.
        </p>
        {currentPlanDef ? (
          <p style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '10px' }}>
            Current package: <strong>{currentPlanDef.name}</strong>
          </p>
        ) : null}
        {isPlatformAdmin ? (
          <p style={{ fontSize: '13px', color: 'var(--success)', marginTop: '8px' }}>
            Platform admin access bypasses workspace packaging limits.
          </p>
        ) : null}
      </div>

      {usage ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          <div style={{ padding: '20px', borderRadius: '20px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700', marginBottom: '8px' }}>
              Package summary
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {currentPlanDef?.name || 'Workflow Free'}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
              Auto-execution: <strong>{currentPlanDef?.autoExecution ? 'enabled' : 'manual'}</strong> · Manual approvals required: <strong>{currentPlanDef?.manualApprovalsRequired ? 'yes' : 'no'}</strong>
            </div>
            {(recommendations || []).length ? (
              <div style={{ marginTop: '12px', display: 'grid', gap: '6px' }}>
                {recommendations.map((message) => (
                  <div key={message} style={{ fontSize: '12px', color: '#b45309', lineHeight: '1.6' }}>
                    • {message}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <UsageCard label="Workflows this month" counter={usage.workflowsExecuted} />
          <UsageCard label="Actions this month" counter={usage.actionsExecuted} />
          <UsageCard label="Connected systems" counter={usage.integrationsConnected} />
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        {orderedPlans.map((plan) => {
          const presentation = PLAN_COPY[plan.key] || PLAN_COPY.free;
          const isCurrent = currentPlan === plan.key;
          return (
            <div
              key={plan.key}
              style={{
                background: 'var(--surface)',
                border: `2px solid ${isCurrent ? presentation.color : 'var(--border)'}`,
                borderRadius: '18px',
                padding: '24px',
                position: 'relative',
              }}
            >
              {presentation.badge ? (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '20px',
                    background: presentation.color,
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '4px 10px',
                    borderRadius: '999px',
                  }}
                >
                  {presentation.badge}
                </div>
              ) : null}
              {isCurrent ? (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '20px',
                    background: 'var(--success)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckIcon size="xs" /> Current
                </div>
              ) : null}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: presentation.color }}>
                {presentation.icon}
                <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {plan.name}
                </div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {plan.priceLabel || `$${plan.price}`}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                / {plan.billingPeriod || 'month'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '18px', minHeight: '44px' }}>
                {presentation.tagline}
              </div>

              <button
                onClick={() => handleUpgrade(plan.key)}
                disabled={isCurrent || isPlatformAdmin || upgrading === plan.key}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: isCurrent || isPlatformAdmin ? 'default' : 'pointer',
                  background: isCurrent ? 'var(--surface-alt)' : presentation.color,
                  color: isCurrent ? 'var(--text-muted)' : '#fff',
                  fontWeight: '700',
                  fontSize: '14px',
                  marginBottom: '18px',
                }}
              >
                {upgrading === plan.key
                  ? 'Updating…'
                  : isCurrent
                    ? 'Current package'
                    : isPlatformAdmin
                      ? 'Included with admin'
                      : plan.key === 'enterprise'
                        ? 'Switch to enterprise'
                        : `Upgrade to ${plan.name}`}
              </button>

              <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                {[
                  `${plan.workflowLimit === -1 ? 'Unlimited' : plan.workflowLimit} workflows / month`,
                  `${plan.actionLimit === -1 ? 'Unlimited' : plan.actionLimit} actions / month`,
                  `${plan.integrationLimit === -1 ? 'Unlimited' : plan.integrationLimit} integrations`,
                  plan.autoExecution ? 'Auto-execution enabled' : 'Manual execution mode',
                ].map((line) => (
                  <div key={line} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <CheckIcon size="xs" style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                {presentation.highlights.map((feature) => (
                  <div key={feature} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    • {feature}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
