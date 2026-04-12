/**
 * FeatureGuide — inline "how to use this page" banner.
 * Shows once per session per key, collapsible, with step cards.
 *
 * Usage:
 *   <FeatureGuide
 *     storageKey="pomodoro-guide"
 *     title="Focus Timer"
 *     icon={<TimerIcon />}
 *     description="The Pomodoro technique improves focus with structured work/break intervals."
 *     steps={[
 *       { icon: <PlayIcon />, title: 'Start a session', body: 'Select a mode and click Start.' },
 *       { icon: <TaskIcon />, title: 'Link a task', body: 'Choose a task to track focus time against it.' },
 *     ]}
 *     tips={['Use Short Break after every 25-min session', 'Long Break every 4 pomodoros']}
 *   />
 */
import React, { useState, useEffect } from 'react';
import { InfoIcon, ChevronDown, ChevronUp, CloseIcon } from './Icons';

export default function FeatureGuide({
  storageKey,
  title,
  icon,
  description,
  steps = [],
  tips = [],
  accentColor = 'var(--primary)',
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const val = sessionStorage.getItem(`guide-${storageKey}`);
    if (!val) {
      setOpen(true);
    } else {
      setDismissed(true);
    }
  }, [storageKey]);

  const dismiss = () => {
    sessionStorage.setItem(`guide-${storageKey}`, '1');
    setDismissed(true);
    setOpen(false);
  };

  if (dismissed && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '12px', color: 'var(--text-muted)', background: 'none',
          border: 'none', cursor: 'pointer', padding: '2px 0', marginBottom: '8px',
        }}
        title="Show feature guide"
      >
        <InfoIcon size="xs" />
        How to use {title}
      </button>
    );
  }

  if (!open) return null;

  return (
    <div style={{
      border: `1px solid ${accentColor}33`,
      borderLeft: `4px solid ${accentColor}`,
      borderRadius: 'var(--radius)',
      background: `${accentColor}08`,
      padding: '16px 20px',
      marginBottom: '24px',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: steps.length ? '14px' : 0 }}>
        <span style={{ color: accentColor, marginTop: '2px', fontSize: '16px' }}>{icon || <InfoIcon />}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
              How to use: {title}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {description}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px' }}
            title="Collapse guide"
          >
            <ChevronUp size="xs" />
          </button>
          <button
            onClick={dismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px' }}
            title="Dismiss guide"
          >
            <CloseIcon size="xs" />
          </button>
        </div>
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(180px, 1fr))`,
          gap: '10px',
          marginBottom: tips.length ? '12px' : 0,
        }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '10px 12px',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: accentColor, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '700', flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {step.icon && <span style={{ marginRight: '4px', color: accentColor }}>{step.icon}</span>}
                  {step.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {step.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '6px',
          borderTop: steps.length ? '1px solid var(--border)' : 'none',
          paddingTop: steps.length ? '10px' : 0,
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginRight: '4px' }}>
            Tips:
          </span>
          {tips.map((tip, i) => (
            <span key={i} style={{
              fontSize: '11px', color: 'var(--text-secondary)',
              background: 'var(--surface-alt)', borderRadius: '10px',
              padding: '2px 8px', border: '1px solid var(--border)',
            }}>
              {tip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
