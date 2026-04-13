import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { updateProfile } from '../api/auth';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  UserPlusIcon, UsersIcon, SaveIcon, TimerIcon, SliderIcon, CheckIcon,
  InfoIcon, FlashIcon, SunIcon, MoonIcon, LayoutIcon,
  LockIcon, KeyIcon, UserShieldIcon, AlarmIcon, ClockIcon, BreakIcon,
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

  const sectionStyle = { padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '20px' };
  const sectionHeadStyle = { fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' };
  const numInputStyle = { width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' };
  const labelStyle = { fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' };

  return (
    <div style={{ padding: '32px', maxWidth: '600px' }}>

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
          <Button type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {saving ? <FlashIcon size="xs" /> : <SaveIcon size="xs" />}
              {saving ? 'Saving...' : 'Save Profile'}
            </span>
          </Button>
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
    </div>
  );
}
