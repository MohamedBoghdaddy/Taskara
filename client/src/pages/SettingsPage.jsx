import React, { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { updateProfile } from '../api/auth';
import { getOperationsOverview, runConnectorVerification, runWorkflowVerification } from '../api/operations';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  UserPlusIcon, UsersIcon, SaveIcon, TimerIcon, SliderIcon, CheckIcon,
  InfoIcon, FlashIcon, SunIcon, MoonIcon, LayoutIcon,
  LockIcon, KeyIcon, UserShieldIcon, AlarmIcon, ClockIcon, BreakIcon,
  WorkflowIcon, PlugIcon, AnalyticsIcon, ShieldIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: <SunIcon size="sm" /> },
  { value: 'dark', label: 'Dark', icon: <MoonIcon size="sm" /> },
  { value: 'system', label: 'System', icon: <LayoutIcon size="sm" /> },
];

export default function SettingsPage() {
  const { user, updateUser, preferences } = useAuthStore();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    timezone: user?.timezone || 'UTC',
  });
  const [prefs, setPrefs] = useState({
    theme: preferences?.theme || 'system',
    defaultPomodoroMinutes: preferences?.defaultPomodoroMinutes || 25,
    defaultShortBreakMinutes: preferences?.defaultShortBreakMinutes || 5,
    defaultLongBreakMinutes: preferences?.defaultLongBreakMinutes || 15,
  });
  const [saving, setSaving] = useState(false);
  const [opsOverview, setOpsOverview] = useState(null);
  const [opsLoading, setOpsLoading] = useState(true);
  const [opsAction, setOpsAction] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { user: updated } = await updateProfile({ ...profile });
      updateUser(updated);
      toast.success('Profile saved');
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const handleSavePrefs = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { user: updated } = await updateProfile({ preferences: prefs });
      updateUser(updated);
      document.documentElement.setAttribute(
        'data-theme',
        prefs.theme === 'dark' ? 'dark'
          : prefs.theme === 'light' ? 'light'
          : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      );
      toast.success('Preferences saved');
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const loadOpsOverview = useCallback(async () => {
    setOpsLoading(true);
    try {
      const data = await getOperationsOverview();
      setOpsOverview(data);
    } catch (error) {
      if (error.response?.status !== 403) {
        toast.error(error.response?.data?.error || 'Failed to load production readiness status');
      }
    } finally {
      setOpsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOpsOverview();
  }, [loadOpsOverview]);

  const handleRunWorkflowTest = async (audienceType) => {
    setOpsAction(`workflow-${audienceType}`);
    try {
      const data = await runWorkflowVerification(audienceType);
      toast.success(data.result?.passed ? `${audienceType} workflow test passed` : `${audienceType} workflow test finished with blockers`);
      await loadOpsOverview();
    } catch (error) {
      toast.error(error.response?.data?.error || `Failed to run ${audienceType} workflow test`);
    } finally {
      setOpsAction('');
    }
  };

  const handleRunConnectorTest = async (provider) => {
    setOpsAction(`connector-${provider}`);
    try {
      const data = await runConnectorVerification(provider);
      toast.success(data.result?.passed ? `${provider} connector test passed` : `${provider} connector test finished with warnings`);
      await loadOpsOverview();
    } catch (error) {
      toast.error(error.response?.data?.error || `Failed to test ${provider}`);
    } finally {
      setOpsAction('');
    }
  };

  const sectionStyle = { padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '20px' };
  const sectionHeadStyle = { fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' };
  const numInputStyle = { width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' };
  const labelStyle = { fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' };

  const sectionCard = { padding: '20px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' };
  const launchTone = opsOverview?.launchStatus?.status === 'green'
    ? { bg: 'var(--success)12', border: 'var(--success)44', color: 'var(--success)' }
    : opsOverview?.launchStatus?.status === 'yellow'
      ? { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)', color: '#b45309' }
      : { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.24)', color: '#b91c1c' };

  return (
    <div style={{ padding: '32px', maxWidth: '1040px' }}>

      <FeatureGuide
        storageKey="settings-guide"
        title="Settings"
        icon={<SliderIcon />}
        description="Manage your profile, pick a colour theme, and tune your Pomodoro timer defaults. Changes are saved per-section."
        steps={[
          { icon: <UserPlusIcon size="xs" />, title: 'Profile', body: 'Update your name, email, and timezone. These appear across the app and in exports.' },
          { icon: <SunIcon size="xs" />, title: 'Appearance', body: 'Choose Light, Dark, or System theme. System auto-follows your OS preference.' },
          { icon: <TimerIcon size="xs" />, title: 'Timer defaults', body: 'Set default focus, short-break, and long-break durations for the Pomodoro timer.' },
          { icon: <FlashIcon size="xs" />, title: 'Save each section', body: 'Profile and Preferences are saved independently — click the section Save button.' },
        ]}
        tips={[
          'System theme updates automatically when you change OS appearance',
          'Focus sessions are typically 25 min; adjust to your flow',
          'Long breaks are recommended every 4 focus sessions',
        ]}
      />

      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <SliderIcon style={{ color: 'var(--primary)' }} />
        Settings
      </h1>

      {/* Profile */}
      <div style={sectionStyle}>
        <h2 style={sectionHeadStyle}>
          <UsersIcon style={{ color: 'var(--primary)' }} size="sm" />
          Profile
        </h2>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input label="Name" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
          <Input label="Email" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
          <Input label="Timezone" value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} placeholder="e.g. America/New_York" />
          <Tooltip content="Save your profile changes" placement="right">
            <Button type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {saving ? <FlashIcon size="xs" /> : <CheckIcon size="xs" />}
                {saving ? 'Saving...' : 'Save Profile'}
              </span>
            </Button>
          </Tooltip>
        </form>
      </div>

      {/* Preferences */}
      <div style={sectionStyle}>
        <h2 style={sectionHeadStyle}>
          <SliderIcon style={{ color: 'var(--primary)' }} size="sm" />
          Preferences
        </h2>
        <form onSubmit={handleSavePrefs} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Theme */}
          <div>
            <label style={labelStyle}>Appearance</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {THEME_OPTIONS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setPrefs(p => ({ ...p, theme: t.value }))}
                  style={{ flex: 1, padding: '10px 8px', border: `2px solid ${prefs.theme === t.value ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', background: prefs.theme === t.value ? 'var(--primary-soft)' : 'var(--surface)', color: prefs.theme === t.value ? 'var(--primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: prefs.theme === t.value ? '600' : '400', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pomodoro timers */}
          <div>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
              <TimerIcon size="xs" style={{ color: 'var(--primary)' }} />
              Pomodoro Timer Defaults
              <Tooltip content="These durations are used as defaults when you start a new Focus Timer session." placement="right">
                <span style={{ color: 'var(--text-muted)', display: 'flex', cursor: 'default' }}><InfoIcon size="xs" /></span>
              </Tooltip>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '4px' }}><ClockIcon size="xs" color="var(--primary)" /> Focus (min)</label>
                <input
                  type="number" min={1} max={120}
                  value={prefs.defaultPomodoroMinutes}
                  onChange={e => setPrefs(p => ({ ...p, defaultPomodoroMinutes: +e.target.value }))}
                  style={numInputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '4px' }}><BreakIcon size="xs" color="var(--success)" /> Short break</label>
                <input
                  type="number" min={1} max={30}
                  value={prefs.defaultShortBreakMinutes}
                  onChange={e => setPrefs(p => ({ ...p, defaultShortBreakMinutes: +e.target.value }))}
                  style={numInputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '4px' }}><AlarmIcon size="xs" color="#8b5cf6" /> Long break</label>
                <input
                  type="number" min={1} max={60}
                  value={prefs.defaultLongBreakMinutes}
                  onChange={e => setPrefs(p => ({ ...p, defaultLongBreakMinutes: +e.target.value }))}
                  style={numInputStyle}
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {saving ? <FlashIcon size="xs" /> : <SaveIcon size="xs" />}
              {saving ? 'Saving...' : 'Save Preferences'}
            </span>
          </Button>
        </form>
      </div>
      {/* Security info */}
      <div style={sectionStyle}>
        <h2 style={sectionHeadStyle}>
          <LockIcon style={{ color: '#ef4444' }} size="sm" />
          Security
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { icon: <KeyIcon size="sm" color="#f59e0b" />, title: 'API Access', body: 'API tokens are managed per-integration. Visit Integrations to connect third-party services securely.' },
            { icon: <UserShieldIcon size="sm" color="#6366f1" />, title: 'Account protection', body: 'Your account is protected by hashed credentials. We never store plain-text passwords.' },
            { icon: <LockIcon size="sm" color="#10b981" />, title: 'Data privacy', body: 'All data is scoped to your account. Notes, tasks, and sessions are private by default unless explicitly shared.' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: '12px', padding: '12px', background: 'var(--surface-alt)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <span style={{ flexShrink: 0, marginTop: '2px' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production readiness */}
      {opsOverview ? (
        <div style={sectionStyle}>
          <h2 style={sectionHeadStyle}>
            <ShieldIcon style={{ color: 'var(--primary)' }} size="sm" />
            Production Readiness
          </h2>

          <div style={{ ...sectionCard, background: launchTone.bg, borderColor: launchTone.border, marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Launch Status
                </div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: launchTone.color, marginBottom: '6px' }}>
                  {opsOverview.launchStatus?.go ? 'GO' : 'NO-GO'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                  System mode: <strong>{opsOverview.system?.mode}</strong> · Worker: <strong>{opsOverview.workerHealth?.status}</strong> · Approval system: <strong>{opsOverview.approvalSystem?.status}</strong>
                </div>
              </div>
              <Button variant="secondary" onClick={loadOpsOverview} disabled={opsLoading}>
                {opsLoading ? 'Refreshing…' : 'Refresh status'}
              </Button>
            </div>
            {(opsOverview.launchStatus?.blockers || []).length ? (
              <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
                {opsOverview.launchStatus.blockers.map((reason) => (
                  <div key={reason} style={{ fontSize: '12px', color: launchTone.color, lineHeight: '1.6' }}>
                    • {reason}
                  </div>
                ))}
              </div>
            ) : null}
            {(opsOverview.launchStatus?.warnings || []).length ? (
              <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                {opsOverview.launchStatus.warnings.map((reason) => (
                  <div key={reason} style={{ fontSize: '12px', color: '#b45309', lineHeight: '1.6' }}>
                    • {reason}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Workflow success', value: `${opsOverview.monitoring?.workflowSuccessRate || 0}%`, icon: <WorkflowIcon size="sm" /> },
              { label: 'Failed execution %', value: `${opsOverview.monitoring?.failedExecutionPct || 0}%`, icon: <AnalyticsIcon size="sm" /> },
              { label: 'Connector failure %', value: `${opsOverview.monitoring?.connectorFailureRate || 0}%`, icon: <PlugIcon size="sm" /> },
              { label: 'Worker errors', value: String(opsOverview.monitoring?.workerJobs?.errorCount || 0), icon: <ShieldIcon size="sm" /> },
            ].map((card) => (
              <div key={card.label} style={sectionCard}>
                <div style={{ marginBottom: '8px', color: 'var(--primary)' }}>{card.icon}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', marginBottom: '6px' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>{card.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={sectionCard}>
                <div style={sectionHeadStyle}>
                  <ShieldIcon size="sm" style={{ color: 'var(--primary)' }} />
                  Launch Checklist
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {(opsOverview.checklist || []).map((entry) => (
                    <div key={entry.key} style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{entry.label}</strong>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: entry.status === 'ready' ? 'var(--success)' : entry.status === 'blocked' ? 'var(--error)' : '#b45309' }}>
                          {entry.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{entry.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={sectionCard}>
                <div style={sectionHeadStyle}>
                  <WorkflowIcon size="sm" style={{ color: 'var(--primary)' }} />
                  Workflow Verification
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {['recruiters', 'startups', 'agencies', 'realestate'].map((audienceType) => {
                    const result = (opsOverview.workflowTests || []).find((entry) => entry.key === audienceType);
                    return (
                      <div key={audienceType} style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{audienceType.replace('realestate', 'real estate')}</strong>
                          <Button
                            variant="secondary"
                            onClick={() => handleRunWorkflowTest(audienceType)}
                            disabled={opsAction === `workflow-${audienceType}`}
                            style={{ fontSize: '12px', padding: '8px 10px' }}
                          >
                            {opsAction === `workflow-${audienceType}` ? 'Running…' : 'Run workflow test'}
                          </Button>
                        </div>
                        <div style={{ fontSize: '12px', color: result?.passed ? 'var(--success)' : result?.status === 'warning' ? '#b45309' : 'var(--text-muted)', marginBottom: '6px' }}>
                          {result ? `${result.status} · ${result.lastRunAt ? new Date(result.lastRunAt).toLocaleString() : 'not run yet'}` : 'Not run yet'}
                        </div>
                        {(result?.reasons || []).slice(0, 2).map((reason) => (
                          <div key={reason} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            • {reason}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={sectionCard}>
                <div style={sectionHeadStyle}>
                  <PlugIcon size="sm" style={{ color: 'var(--primary)' }} />
                  Connector Readiness
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {(opsOverview.connectorReadiness || []).map((entry) => (
                    <div key={entry.provider} style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{entry.provider}</strong>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: entry.writebackReady ? 'var(--success)' : entry.connected ? '#b45309' : 'var(--text-muted)' }}>
                          {entry.writebackReady ? 'ready' : entry.status}
                        </span>
                      </div>
                      {(entry.details || []).slice(0, 1).map((detail) => (
                        <div key={detail} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '8px' }}>
                          {detail}
                        </div>
                      ))}
                      {['email', 'slack', 'github', 'google_calendar'].includes(entry.provider) ? (
                        <Button
                          variant="secondary"
                          onClick={() => handleRunConnectorTest(entry.provider)}
                          disabled={opsAction === `connector-${entry.provider}`}
                          style={{ fontSize: '12px', padding: '8px 10px' }}
                        >
                          {opsAction === `connector-${entry.provider}` ? 'Testing…' : entry.provider === 'slack' ? 'Send test message' : entry.provider === 'google_calendar' ? 'Create test event' : 'Run connector test'}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div style={sectionCard}>
                <div style={sectionHeadStyle}>
                  <AnalyticsIcon size="sm" style={{ color: 'var(--primary)' }} />
                  Recent Verification Logs
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {[...(opsOverview.workflowTests || []), ...(opsOverview.connectorTests || [])]
                    .sort((left, right) => new Date(right.lastRunAt || 0) - new Date(left.lastRunAt || 0))
                    .slice(0, 6)
                    .map((entry) => (
                      <div key={`${entry.key}-${entry.lastRunAt || 'none'}`} style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
                          {entry.label || entry.key}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          {entry.status} · {entry.lastRunAt ? new Date(entry.lastRunAt).toLocaleString() : 'not run yet'}
                        </div>
                        {(entry.logs || []).slice(0, 2).map((log) => (
                          <div key={log} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            • {log}
                          </div>
                        ))}
                      </div>
                    ))}
                  {opsLoading ? <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading recent logs…</div> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
