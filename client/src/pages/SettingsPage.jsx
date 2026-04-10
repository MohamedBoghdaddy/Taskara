import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { updateProfile } from '../api/auth';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateUser, preferences } = useAuthStore();
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', timezone: user?.timezone || 'UTC' });
  const [prefs, setPrefs] = useState({ theme: preferences?.theme || 'system', defaultPomodoroMinutes: preferences?.defaultPomodoroMinutes || 25, defaultShortBreakMinutes: preferences?.defaultShortBreakMinutes || 5, defaultLongBreakMinutes: preferences?.defaultLongBreakMinutes || 15 });
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const { user: updated } = await updateProfile({ ...profile });
      updateUser(updated); toast.success('Profile saved');
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const handleSavePrefs = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const { user: updated } = await updateProfile({ preferences: prefs });
      updateUser(updated);
      document.documentElement.setAttribute('data-theme', prefs.theme === 'dark' ? 'dark' : prefs.theme === 'light' ? 'light' : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      toast.success('Preferences saved');
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '600px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '28px' }}>Settings</h1>

      {/* Profile */}
      <div style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Profile</h2>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input label="Name" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
          <Input label="Email" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
          <Input label="Timezone" value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} placeholder="e.g. America/New_York" />
          <Button type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>{saving ? 'Saving...' : 'Save Profile'}</Button>
        </form>
      </div>

      {/* Preferences */}
      <div style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Preferences</h2>
        <form onSubmit={handleSavePrefs} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Theme</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['light','dark','system'].map(t => (
                <button key={t} type="button" onClick={() => setPrefs(p => ({ ...p, theme: t }))} style={{ flex: 1, padding: '8px', border: `2px solid ${prefs.theme === t ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', background: prefs.theme === t ? 'var(--primary-soft)' : 'var(--surface)', color: prefs.theme === t ? 'var(--primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: prefs.theme === t ? '600' : '400', textTransform: 'capitalize' }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Focus (min)</label>
              <input type="number" min={1} max={120} value={prefs.defaultPomodoroMinutes} onChange={e => setPrefs(p => ({ ...p, defaultPomodoroMinutes: +e.target.value }))} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Short break</label>
              <input type="number" min={1} max={30} value={prefs.defaultShortBreakMinutes} onChange={e => setPrefs(p => ({ ...p, defaultShortBreakMinutes: +e.target.value }))} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Long break</label>
              <input type="number" min={1} max={60} value={prefs.defaultLongBreakMinutes} onChange={e => setPrefs(p => ({ ...p, defaultLongBreakMinutes: +e.target.value }))} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} />
            </div>
          </div>
          <Button type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>{saving ? 'Saving...' : 'Save Preferences'}</Button>
        </form>
      </div>
    </div>
  );
}
