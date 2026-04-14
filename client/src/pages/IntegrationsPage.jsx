import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import client from '../api/client';
import FeatureGuide from '../components/common/FeatureGuide';
import {
  PlugIcon, CloudIcon, CheckCircleIcon, ExternalLinkIcon,
  ImportIcon, SendIcon, SlackIcon, GitHubIcon, GoogleIcon,
  TaskIcon, ShareIcon, DeleteIcon, RefreshIcon,
} from '../components/common/Icons';

// Local aliases for readability
const TrashIcon = DeleteIcon;
const SyncIcon  = RefreshIcon;

// ── API helpers ────────────────────────────────────────────────────────────────

const api = {
  // Generic
  getConnected:     ()      => client.get('/integrations/connected').then(r => r.data),

  // Todoist
  importTodoist:    (token) => client.post('/integrations/todoist/import', { apiToken: token }).then(r => r.data),

  // Slack
  testSlack:        (url)   => client.post('/integrations/slack/test', { webhookUrl: url }).then(r => r.data),
  sendSlack:        (url, m)=> client.post('/integrations/slack/notify', { webhookUrl: url, message: m }).then(r => r.data),

  // GitHub
  githubConnect:    (body)  => client.post('/integrations/github/connect', body).then(r => r.data),
  githubSettings:   ()      => client.get('/integrations/github/settings').then(r => r.data),
  githubDisconnect: ()      => client.delete('/integrations/github/disconnect').then(r => r.data),
  githubRepos:      ()      => client.get('/integrations/github/repos').then(r => r.data),
  githubSaveRepos:  (repos) => client.post('/integrations/github/repos', { repos }).then(r => r.data),
  githubSync:       (body)  => client.post('/integrations/github/sync', body).then(r => r.data),

  // Google Calendar
  gcalConnect:      (body)  => client.post('/integrations/google-calendar/connect', body).then(r => r.data),
  gcalSettings:     ()      => client.get('/integrations/google-calendar/settings').then(r => r.data),
  gcalDisconnect:   ()      => client.delete('/integrations/google-calendar/disconnect').then(r => r.data),
  gcalCalendars:    ()      => client.get('/integrations/google-calendar/calendars').then(r => r.data),
  gcalPull:         (days)  => client.post('/integrations/google-calendar/pull', { days }).then(r => r.data),

  // Notion
  notionConnect:    (body)  => client.post('/integrations/notion/connect', body).then(r => r.data),
  notionSettings:   ()      => client.get('/integrations/notion/settings').then(r => r.data),
  notionDisconnect: ()      => client.delete('/integrations/notion/disconnect').then(r => r.data),
  notionDatabases:  ()      => client.get('/integrations/notion/databases').then(r => r.data),
  notionPages:      ()      => client.get('/integrations/notion/pages').then(r => r.data),
  notionImportDB:   (id)    => client.post('/integrations/notion/import-database', { databaseId: id }).then(r => r.data),
  notionImportPages:(ids)   => client.post('/integrations/notion/import-pages', { pageIds: ids }).then(r => r.data),

  // WhatsApp
  waConnect:        (body)  => client.post('/integrations/whatsapp/connect', body).then(r => r.data),
  waSettings:       ()      => client.get('/integrations/whatsapp/settings').then(r => r.data),
  waDisconnect:     ()      => client.delete('/integrations/whatsapp/disconnect').then(r => r.data),
  waSend:           (to, m) => client.post('/integrations/whatsapp/send', { to, message: m }).then(r => r.data),

  // ClickUp
  cuConnect:        (body)  => client.post('/integrations/clickup/connect', body).then(r => r.data),
  cuSettings:       ()      => client.get('/integrations/clickup/settings').then(r => r.data),
  cuDisconnect:     ()      => client.delete('/integrations/clickup/disconnect').then(r => r.data),
  cuSpaces:         (tid)   => client.get(`/integrations/clickup/spaces${tid ? `?teamId=${tid}` : ''}`).then(r => r.data),
  cuLists:          (sid)   => client.get(`/integrations/clickup/lists?spaceId=${sid}`).then(r => r.data),
  cuSync:           (lid)   => client.post('/integrations/clickup/sync', { listId: lid }).then(r => r.data),
};

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle = {
  flex: 1, padding: '9px 12px', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', background: 'var(--surface-alt)',
  color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
  minWidth: 0,
};

const labelStyle = {
  fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px',
};

const sectionStyle = {
  display: 'flex', flexDirection: 'column', gap: '10px',
};

const resultBadge = (color) => ({
  display: 'flex', gap: '20px', padding: '12px 16px',
  background: `var(--${color})10`, border: `1px solid var(--${color})44`,
  borderRadius: 'var(--radius)', fontSize: '13px',
});

// ── IntegrationCard ───────────────────────────────────────────────────────────

function IntegrationCard({ logo, name, description, connected, onDisconnect, children }) {
  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${connected ? 'var(--success)44' : 'var(--border)'}`,
      borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '10px',
          background: 'var(--surface-alt)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', flexShrink: 0,
        }}>
          {logo}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>{name}</h3>
            {connected && (
              <span style={{
                fontSize: '11px', fontWeight: '600', padding: '2px 8px',
                background: 'var(--success)18', color: 'var(--success)',
                borderRadius: '10px', border: '1px solid var(--success)44',
                display: 'inline-flex', alignItems: 'center', gap: '4px',
              }}>
                <CheckCircleIcon size="xs" /> Connected
              </span>
            )}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{description}</p>
        </div>
        {connected && onDisconnect && (
          <button
            onClick={onDisconnect}
            title="Disconnect"
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              padding: '6px 10px', cursor: 'pointer', color: 'var(--text-muted)',
              fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px',
              flexShrink: 0,
            }}
          >
            <TrashIcon size="xs" /> Disconnect
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Inline logos ──────────────────────────────────────────────────────────────

const TodoistLogo = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="#DB4035">
    <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm11.5-3.5L9 13l-1.5-1.5L6 13l3 3 6-6-1.5-1.5z"/>
  </svg>
);

const NotionLogo = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
  </svg>
);

const WhatsAppLogo = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const ClickUpLogo = () => (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <defs>
      <linearGradient id="cuGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#8930FD"/>
        <stop offset="100%" stopColor="#49CCF9"/>
      </linearGradient>
    </defs>
    <path fill="url(#cuGrad)" d="M2 14.3L5.1 11.6C6.9 13.6 8.8 14.5 11.1 14.5C13.4 14.5 15.2 13.6 17 11.6L20.1 14.3C17.5 17.3 14.6 18.8 11.1 18.8C7.6 18.8 4.7 17.3 2 14.3Z"/>
    <path fill="#8930FD" d="M11.1 5.2L5.5 10L3 7.2L11.1 0L19.2 7.2L16.6 10L11.1 5.2Z"/>
  </svg>
);

// ── ImportResult badge ────────────────────────────────────────────────────────
function ImportResult({ result, color = 'success' }) {
  if (!result) return null;
  return (
    <div style={resultBadge(color)}>
      <span style={{ color: `var(--${color})`, display: 'flex', alignItems: 'center', gap: '5px' }}>
        <CheckCircleIcon size="xs" /> {result.imported} imported
      </span>
      {result.skipped != null && (
        <span style={{ color: 'var(--text-muted)' }}>{result.skipped} skipped</span>
      )}
      {result.total != null && (
        <span style={{ color: 'var(--text-secondary)' }}>{result.total} total</span>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════════════════════

export default function IntegrationsPage() {
  const [connected, setConnected] = useState({});
  const [loadingConnected, setLoadingConnected] = useState(true);

  // ── load connected state on mount ─────────────────────────────────────────
  const refreshConnected = useCallback(async () => {
    try {
      const data = await api.getConnected();
      setConnected(data.connected || {});
    } catch (_) {}
    finally { setLoadingConnected(false); }
  }, []);

  useEffect(() => { refreshConnected(); }, [refreshConnected]);

  // ── disconnect helper ─────────────────────────────────────────────────────
  const disconnect = useCallback(async (provider, displayName) => {
    if (!window.confirm(`Disconnect ${displayName}? This removes your stored credentials.`)) return;
    try {
      await client.delete(`/integrations/${provider}/disconnect`);
      setConnected(c => ({ ...c, [provider.replace('-', '_')]: false }));
      toast.success(`${displayName} disconnected`);
    } catch (e) {
      toast.error(e.response?.data?.error || `Failed to disconnect ${displayName}`);
    }
  }, []);

  if (loadingConnected) {
    return (
      <div style={{ padding: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading integrations…</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px', maxWidth: '720px', margin: '0 auto' }}>
      <FeatureGuide
        storageKey="integrations-guide-v2"
        title="Integrations"
        icon={<PlugIcon />}
        description="Connect Taskara with your tools. All credentials are stored securely per workspace and are never shared."
        steps={[
          { icon: <ImportIcon />,  title: 'Enter your credentials', body: 'Each integration uses your own API token or key — nothing is hardcoded.' },
          { icon: <CheckCircleIcon />, title: 'Click Connect', body: 'Taskara verifies your credentials with the provider before saving.' },
          { icon: <SyncIcon />,    title: 'Sync or import', body: 'Import tasks, sync calendars, or push tasks to connected tools.' },
          { icon: <ShareIcon />,   title: 'Automate further', body: 'Combine with Automations to trigger actions across connected tools.' },
        ]}
        tips={[
          'Credentials are stored encrypted in your workspace — visible only to workspace admins',
          'You can disconnect any integration at any time',
          'GitHub: use a Personal Access Token with repo scope',
          'Notion: create an Internal Integration at notion.so/my-integrations',
          'WhatsApp requires a Meta Business account with WhatsApp API access',
          'ClickUp API Token is found under Profile → Apps → API Token',
        ]}
        accentColor="#10b981"
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <PlugIcon style={{ fontSize: '20px', color: 'var(--primary)' }} />
        <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>Integrations</h1>
      </div>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
        Connect Taskara with your favourite tools. Your credentials are saved per workspace.
      </p>

      {/* Status summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '24px' }}>
        {[
          { key: 'github',           label: 'GitHub' },
          { key: 'google_calendar',  label: 'Google Calendar' },
          { key: 'notion',           label: 'Notion' },
          { key: 'whatsapp',         label: 'WhatsApp' },
          { key: 'clickup',          label: 'ClickUp' },
        ].map(({ key, label }) => (
          <div key={key} style={{
            padding: '10px 12px', background: 'var(--surface)',
            border: `1px solid ${connected[key] ? 'var(--success)44' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: connected[key] ? 'var(--success)' : 'var(--text-muted)' }}>
              {connected[key] ? '● Connected' : '○ Not connected'}
            </div>
          </div>
        ))}
      </div>

      {/* ── Todoist ─────────────────────────────────────────────────────────── */}
      <TodoistSection />

      {/* ── Slack ───────────────────────────────────────────────────────────── */}
      <SlackSection />

      {/* ── GitHub ──────────────────────────────────────────────────────────── */}
      <GitHubSection
        connected={!!connected.github}
        onConnected={() => { setConnected(c => ({ ...c, github: true })); }}
        onDisconnect={() => disconnect('github', 'GitHub')}
      />

      {/* ── Google Calendar ─────────────────────────────────────────────────── */}
      <GoogleCalendarSection
        connected={!!connected.google_calendar}
        onConnected={() => { setConnected(c => ({ ...c, google_calendar: true })); }}
        onDisconnect={() => disconnect('google-calendar', 'Google Calendar')}
      />

      {/* ── Notion ──────────────────────────────────────────────────────────── */}
      <NotionSection
        connected={!!connected.notion}
        onConnected={() => { setConnected(c => ({ ...c, notion: true })); }}
        onDisconnect={() => disconnect('notion', 'Notion')}
      />

      {/* ── WhatsApp ────────────────────────────────────────────────────────── */}
      <WhatsAppSection
        connected={!!connected.whatsapp}
        onConnected={() => { setConnected(c => ({ ...c, whatsapp: true })); }}
        onDisconnect={() => disconnect('whatsapp', 'WhatsApp')}
      />

      {/* ── ClickUp ─────────────────────────────────────────────────────────── */}
      <ClickUpSection
        connected={!!connected.clickup}
        onConnected={() => { setConnected(c => ({ ...c, clickup: true })); }}
        onDisconnect={() => disconnect('clickup', 'ClickUp')}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Todoist Section (existing — unchanged behaviour)
// ══════════════════════════════════════════════════════════════════════════════

function TodoistSection() {
  const [token, setToken]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);

  const handleImport = async () => {
    if (!token.trim()) return toast.error('Enter your Todoist API token');
    setLoading(true); setResult(null);
    try {
      const r = await api.importTodoist(token.trim());
      setResult(r);
      toast.success(`Imported ${r.imported} tasks`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Todoist import failed');
    } finally { setLoading(false); }
  };

  return (
    <IntegrationCard
      logo={<TodoistLogo />}
      name="Todoist"
      description="One-click import of all your Todoist tasks into Taskara."
      connected={!!result}
    >
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Todoist API Token
          <a href="https://app.todoist.com/app/settings/integrations/developer" target="_blank" rel="noopener noreferrer"
            style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            Get token <ExternalLinkIcon size="xs" />
          </a>
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="password" value={token} onChange={e => setToken(e.target.value)}
            placeholder="Paste your Todoist API token…" style={inputStyle} />
          <Button onClick={handleImport} loading={loading} disabled={!token.trim() || loading}>
            <ImportIcon size="xs" /> Import
          </Button>
        </div>
        <ImportResult result={result} />
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          Token is used once and not stored. Tasks are created as "Todo".
        </p>
      </div>
    </IntegrationCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Slack Section (existing — unchanged behaviour)
// ══════════════════════════════════════════════════════════════════════════════

function SlackSection() {
  const [url, setUrl]               = useState('');
  const [msg, setMsg]               = useState('');
  const [loading, setLoading]       = useState(false);
  const [connected, setConnected]   = useState(false);

  const isValid = /^https:\/\/hooks\.slack\.com\/services\//i.test(url.trim());

  const handleTest = async () => {
    if (!url.trim()) return toast.error('Enter Slack webhook URL');
    if (!isValid) return toast.error('URL must start with https://hooks.slack.com/services/');
    setLoading(true);
    try {
      await api.testSlack(url.trim());
      setConnected(true); toast.success('Slack test message sent!');
    } catch (e) { toast.error(e.response?.data?.error || 'Slack test failed'); }
    finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!msg.trim()) return toast.error('Enter a message');
    setLoading(true);
    try {
      await api.sendSlack(url.trim(), msg.trim());
      toast.success('Message sent to Slack!'); setMsg('');
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to send'); }
    finally { setLoading(false); }
  };

  return (
    <IntegrationCard
      logo={<SlackIcon size="lg" color="#4A154B" />}
      name="Slack"
      description="Send task and sprint notifications to your Slack channels."
      connected={connected}
    >
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Slack Incoming Webhook URL
          <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer"
            style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            Create webhook <ExternalLinkIcon size="xs" />
          </a>
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="url" value={url} onChange={e => { setUrl(e.target.value); setConnected(false); }}
            placeholder="https://hooks.slack.com/services/…" style={inputStyle} />
          <Button variant="secondary" onClick={handleTest} loading={loading} disabled={!url.trim() || !isValid || loading}>
            Test
          </Button>
        </div>
        {url.trim() && !isValid && (
          <p style={{ fontSize: '12px', color: 'var(--error)', margin: 0 }}>
            Must start with https://hooks.slack.com/services/
          </p>
        )}
        {connected && (
          <div style={{ ...sectionStyle }}>
            <div style={{ padding: '10px 12px', background: 'var(--success)10', border: '1px solid var(--success)44', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--success)' }}>
              Connected. Taskara can send notifications to this channel.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={msg} onChange={e => setMsg(e.target.value)}
                placeholder="Send a test message…" onKeyDown={e => e.key === 'Enter' && handleSend()}
                style={inputStyle} />
              <Button onClick={handleSend} loading={loading} disabled={!msg.trim() || loading}>
                <SendIcon size="xs" /> Send
              </Button>
            </div>
          </div>
        )}
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          Also configure in <Link to="/automations" style={{ color: 'var(--primary)' }}>Automations</Link> for event-driven notifications.
        </p>
      </div>
    </IntegrationCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GitHub Section
// ══════════════════════════════════════════════════════════════════════════════

function GitHubSection({ connected, onConnected, onDisconnect }) {
  const [token, setToken]     = useState('');
  const [loading, setLoading] = useState(false);
  const [repos, setRepos]     = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [syncResult, setSyncResult] = useState(null);
  const [profile, setProfile] = useState(null);

  const handleConnect = async () => {
    if (!token.trim()) return toast.error('Enter your GitHub Personal Access Token');
    setLoading(true);
    try {
      const data = await api.githubConnect({ accessToken: token.trim() });
      setProfile(data.profile);
      onConnected();
      toast.success(`Connected as ${data.profile.login}`);
      setToken('');
      loadRepos();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'GitHub connection failed');
    } finally { setLoading(false); }
  };

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const data = await api.githubRepos();
      setRepos(data.repos || []);
    } catch (e) {
      toast.error('Failed to load repos: ' + (e.response?.data?.error || e.message));
    } finally { setLoadingRepos(false); }
  };

  useEffect(() => { if (connected) loadRepos(); }, [connected]);

  const toggleRepo = (r) => {
    const key = `${r.owner}/${r.repo}`;
    setSelectedRepos(prev =>
      prev.find(s => `${s.owner}/${s.repo}` === key)
        ? prev.filter(s => `${s.owner}/${s.repo}` !== key)
        : [...prev, { owner: r.owner, repo: r.repo }]
    );
  };

  const handleSaveRepos = async () => {
    if (!selectedRepos.length) return toast.error('Select at least one repo');
    try {
      await api.githubSaveRepos(selectedRepos);
      toast.success('Repos saved');
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to save repos'); }
  };

  const handleSync = async () => {
    setLoading(true); setSyncResult(null);
    try {
      const data = await api.githubSync();
      setSyncResult(data);
      toast.success(`Synced ${data.imported} issues`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Sync failed');
    } finally { setLoading(false); }
  };

  return (
    <IntegrationCard
      logo={<GitHubIcon size="lg" color="#333" />}
      name="GitHub"
      description="Link commits and PRs to tasks. Import issues as tasks automatically."
      connected={connected}
      onDisconnect={onDisconnect}
    >
      {!connected ? (
        <div style={sectionStyle}>
          <label style={labelStyle}>
            Personal Access Token (requires <code>repo</code> scope)
            <a href="https://github.com/settings/tokens/new?scopes=repo&description=Taskara" target="_blank" rel="noopener noreferrer"
              style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              Create token <ExternalLinkIcon size="xs" />
            </a>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="password" value={token} onChange={e => setToken(e.target.value)}
              placeholder="ghp_…" style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleConnect()} />
            <Button onClick={handleConnect} loading={loading} disabled={!token.trim() || loading}>
              Connect
            </Button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Token is stored securely in your workspace. Fine-grained tokens also supported.
          </p>
        </div>
      ) : (
        <div style={sectionStyle}>
          {profile && (
            <div style={{ fontSize: '13px', color: 'var(--success)' }}>
              Connected as <strong>{profile.login}</strong> · {profile.public_repos} repos
            </div>
          )}

          {/* Repo picker */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>
              Select repos to sync {repos.length > 0 && `(${repos.length} available)`}
            </span>
            <Button variant="secondary" onClick={loadRepos} loading={loadingRepos} style={{ fontSize: '12px', padding: '5px 10px' }}>
              <RefreshIcon size="xs" /> Refresh
            </Button>
          </div>

          {loadingRepos ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading repos…</p>
          ) : (
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px' }}>
              {repos.length === 0
                ? <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>No repos found.</p>
                : repos.map(r => {
                    const key = `${r.owner}/${r.repo}`;
                    const checked = !!selectedRepos.find(s => `${s.owner}/${s.repo}` === key);
                    return (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px', cursor: 'pointer', borderRadius: '4px' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleRepo(r)} />
                        <span style={{ fontSize: '13px' }}>
                          {r.fullName}
                          {r.private && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>private</span>}
                        </span>
                      </label>
                    );
                  })
              }
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={handleSaveRepos} disabled={!selectedRepos.length}>
              Save Selection
            </Button>
            <Button onClick={handleSync} loading={loading} disabled={loading}>
              <SyncIcon size="xs" /> Sync Issues → Tasks
            </Button>
          </div>

          {syncResult && (
            <div>
              <ImportResult result={{ imported: syncResult.imported, skipped: syncResult.skipped, total: syncResult.imported + syncResult.skipped }} />
              {syncResult.results?.map(r => (
                <div key={r.repo} style={{ fontSize: '12px', color: r.error ? 'var(--error)' : 'var(--text-muted)', marginTop: '4px' }}>
                  {r.repo}: {r.error || `${r.imported} imported, ${r.skipped} skipped`}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </IntegrationCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Google Calendar Section
// ══════════════════════════════════════════════════════════════════════════════

function GoogleCalendarSection({ connected, onConnected, onDisconnect }) {
  const [form, setForm]       = useState({ accessToken: '', refreshToken: '', clientId: '', clientSecret: '', calendarId: 'primary' });
  const [loading, setLoading] = useState(false);
  const [pullResult, setPullResult] = useState(null);
  const [mode, setMode]       = useState('access'); // 'access' | 'oauth'

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleConnect = async () => {
    const creds = mode === 'access'
      ? { accessToken: form.accessToken, calendarId: form.calendarId }
      : { refreshToken: form.refreshToken, clientId: form.clientId, clientSecret: form.clientSecret, calendarId: form.calendarId };

    if (mode === 'access' && !form.accessToken) return toast.error('Enter your Access Token');
    if (mode === 'oauth' && (!form.refreshToken || !form.clientId || !form.clientSecret)) {
      return toast.error('All OAuth fields are required');
    }

    setLoading(true);
    try {
      await api.gcalConnect(creds);
      onConnected();
      toast.success('Google Calendar connected');
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Connection failed');
    } finally { setLoading(false); }
  };

  const handlePull = async () => {
    setLoading(true); setPullResult(null);
    try {
      const data = await api.gcalPull(7);
      setPullResult(data);
      toast.success(`Pulled ${data.imported} events as reminders`);
    } catch (e) { toast.error(e.response?.data?.error || 'Pull failed'); }
    finally { setLoading(false); }
  };

  return (
    <IntegrationCard
      logo={<GoogleIcon size="lg" color="#4285F4" />}
      name="Google Calendar"
      description="Sync task due dates to Google Calendar. Pull events as Taskara reminders."
      connected={connected}
      onDisconnect={onDisconnect}
    >
      {!connected ? (
        <div style={sectionStyle}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
            {['access', 'oauth'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                border: mode === m ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: mode === m ? 'var(--primary)18' : 'var(--surface-alt)',
                color: mode === m ? 'var(--primary)' : 'var(--text-secondary)',
              }}>
                {m === 'access' ? 'Access Token' : 'OAuth2 (refresh token)'}
              </button>
            ))}
          </div>

          {mode === 'access' ? (
            <div style={sectionStyle}>
              <div>
                <label style={labelStyle}>
                  Access Token
                  <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer"
                    style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    Get from OAuth Playground <ExternalLinkIcon size="xs" />
                  </a>
                </label>
                <input type="password" value={form.accessToken} onChange={e => setField('accessToken', e.target.value)}
                  placeholder="ya29.…" style={{ ...inputStyle, width: '100%' }} />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Short-lived. For persistent sync, use OAuth2 mode with a refresh token.
              </p>
            </div>
          ) : (
            <div style={sectionStyle}>
              <div>
                <label style={labelStyle}>
                  Client ID
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
                    style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    Google Cloud Console <ExternalLinkIcon size="xs" />
                  </a>
                </label>
                <input type="text" value={form.clientId} onChange={e => setField('clientId', e.target.value)}
                  placeholder="xxxxx.apps.googleusercontent.com" style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={labelStyle}>Client Secret</label>
                <input type="password" value={form.clientSecret} onChange={e => setField('clientSecret', e.target.value)}
                  placeholder="GOCSPX-…" style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={labelStyle}>
                  Refresh Token
                  <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer"
                    style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    OAuth Playground <ExternalLinkIcon size="xs" />
                  </a>
                </label>
                <input type="password" value={form.refreshToken} onChange={e => setField('refreshToken', e.target.value)}
                  placeholder="1//…" style={{ ...inputStyle, width: '100%' }} />
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Calendar ID (default: primary)</label>
            <input type="text" value={form.calendarId} onChange={e => setField('calendarId', e.target.value)}
              placeholder="primary or your-email@gmail.com" style={{ ...inputStyle, width: '100%' }} />
          </div>

          <Button onClick={handleConnect} loading={loading} disabled={loading}>
            Connect Google Calendar
          </Button>
        </div>
      ) : (
        <div style={sectionStyle}>
          <div style={{ padding: '10px 14px', background: 'var(--success)10', border: '1px solid var(--success)44', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--success)' }}>
            Calendar connected. Due dates sync automatically when you push tasks.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={handlePull} loading={loading} disabled={loading}>
              <ImportIcon size="xs" /> Pull Next 7 Days → Reminders
            </Button>
          </div>
          {pullResult && <ImportResult result={pullResult} />}
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Push individual task due dates to Calendar from the task detail panel.
          </p>
        </div>
      )}
    </IntegrationCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Notion Section
// ══════════════════════════════════════════════════════════════════════════════

function NotionSection({ connected, onConnected, onDisconnect }) {
  const [token, setToken]     = useState('');
  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [pages, setPages]     = useState([]);
  const [selectedDb, setSelectedDb]   = useState('');
  const [selectedPages, setSelectedPages] = useState([]);
  const [importResult, setImportResult]   = useState(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [tab, setTab]         = useState('databases'); // 'databases' | 'pages'

  const handleConnect = async () => {
    if (!token.trim()) return toast.error('Enter your Notion Integration Token');
    setLoading(true);
    try {
      const data = await api.notionConnect({ apiToken: token.trim() });
      setWorkspaceName(data.profile?.workspaceName || '');
      onConnected();
      toast.success(`Connected to ${data.profile?.workspaceName || 'Notion'}`);
      setToken('');
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Notion connection failed');
    } finally { setLoading(false); }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [dbData, pgData] = await Promise.all([api.notionDatabases(), api.notionPages()]);
      setDatabases(dbData.databases || []);
      setPages(pgData.pages || []);
    } catch (e) {
      toast.error('Failed to load Notion data: ' + (e.response?.data?.error || e.message));
    } finally { setLoading(false); }
  };

  useEffect(() => { if (connected) loadData(); }, [connected]);

  const handleImportDB = async () => {
    if (!selectedDb) return toast.error('Select a database');
    setLoading(true); setImportResult(null);
    try {
      const data = await api.notionImportDB(selectedDb);
      setImportResult(data);
      toast.success(`Imported ${data.imported} tasks from Notion`);
    } catch (e) { toast.error(e.response?.data?.error || 'Import failed'); }
    finally { setLoading(false); }
  };

  const handleImportPages = async () => {
    if (!selectedPages.length) return toast.error('Select at least one page');
    setLoading(true); setImportResult(null);
    try {
      const data = await api.notionImportPages(selectedPages);
      setImportResult(data);
      toast.success(`Imported ${data.imported} pages as notes`);
    } catch (e) { toast.error(e.response?.data?.error || 'Import failed'); }
    finally { setLoading(false); }
  };

  const togglePage = (id) => {
    setSelectedPages(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  return (
    <IntegrationCard
      logo={<NotionLogo />}
      name="Notion"
      description="Import Notion database rows as tasks and pages as notes."
      connected={connected}
      onDisconnect={onDisconnect}
    >
      {!connected ? (
        <div style={sectionStyle}>
          <label style={labelStyle}>
            Notion Integration Token (starts with <code>secret_</code>)
            <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer"
              style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              Create integration <ExternalLinkIcon size="xs" />
            </a>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="password" value={token} onChange={e => setToken(e.target.value)}
              placeholder="secret_…" style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleConnect()} />
            <Button onClick={handleConnect} loading={loading} disabled={!token.trim() || loading}>
              Connect
            </Button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            After creating the integration, share your databases/pages with it in Notion.
          </p>
        </div>
      ) : (
        <div style={sectionStyle}>
          {workspaceName && (
            <div style={{ fontSize: '13px', color: 'var(--success)' }}>
              Connected to <strong>{workspaceName}</strong>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            {['databases', 'pages'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                border: tab === t ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: tab === t ? 'var(--primary)18' : 'none',
                color: tab === t ? 'var(--primary)' : 'var(--text-secondary)',
              }}>
                {t === 'databases' ? `Databases (${databases.length})` : `Pages (${pages.length})`}
              </button>
            ))}
            <Button variant="secondary" onClick={loadData} loading={loading} style={{ marginLeft: 'auto', fontSize: '12px', padding: '5px 10px' }}>
              <RefreshIcon size="xs" />
            </Button>
          </div>

          {tab === 'databases' ? (
            <>
              {databases.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  No databases found. Share a database with your integration in Notion.
                </p>
              ) : (
                <>
                  <select value={selectedDb} onChange={e => setSelectedDb(e.target.value)}
                    style={{ ...inputStyle, flex: 'none' }}>
                    <option value="">Select a database…</option>
                    {databases.map(db => (
                      <option key={db.id} value={db.id}>{db.title}</option>
                    ))}
                  </select>
                  <Button onClick={handleImportDB} loading={loading} disabled={!selectedDb || loading}>
                    <ImportIcon size="xs" /> Import as Tasks
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {pages.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  No pages found. Share pages with your integration in Notion.
                </p>
              ) : (
                <>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px' }}>
                    {pages.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedPages.includes(p.id)} onChange={() => togglePage(p.id)} />
                        <span style={{ fontSize: '13px' }}>{p.title}</span>
                      </label>
                    ))}
                  </div>
                  <Button onClick={handleImportPages} loading={loading} disabled={!selectedPages.length || loading}>
                    <ImportIcon size="xs" /> Import Selected as Notes
                  </Button>
                </>
              )}
            </>
          )}

          {importResult && <ImportResult result={importResult} />}
        </div>
      )}
    </IntegrationCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WhatsApp Section
// ══════════════════════════════════════════════════════════════════════════════

function WhatsAppSection({ connected, onConnected, onDisconnect }) {
  const [form, setForm]       = useState({ accessToken: '', phoneNumberId: '', businessAccountId: '', webhookVerifyToken: 'taskara_webhook' });
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [testTo, setTestTo]   = useState('');
  const [testMsg, setTestMsg] = useState('Hello from Taskara! 👋');

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleConnect = async () => {
    if (!form.accessToken || !form.phoneNumberId) {
      return toast.error('Access Token and Phone Number ID are required');
    }
    setLoading(true);
    try {
      const data = await api.waConnect(form);
      setProfile(data.profile);
      onConnected();
      toast.success(`Connected: ${data.profile.businessName} (${data.profile.phoneNumber})`);
      setForm(f => ({ ...f, accessToken: '' }));
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'WhatsApp connection failed');
    } finally { setLoading(false); }
  };

  const handleSendTest = async () => {
    if (!testTo.trim() || !testMsg.trim()) return toast.error('Enter phone number and message');
    setLoading(true);
    try {
      await api.waSend(testTo.trim(), testMsg.trim());
      toast.success('Message sent!');
    } catch (e) { toast.error(e.response?.data?.error || 'Send failed'); }
    finally { setLoading(false); }
  };

  const webhookUrl = `${window.location.origin.replace('3000', '5000')}/api/integrations/whatsapp/webhook`;

  return (
    <IntegrationCard
      logo={<WhatsAppLogo />}
      name="WhatsApp"
      description="Send task reminders and receive commands via WhatsApp Business API."
      connected={connected}
      onDisconnect={onDisconnect}
    >
      {!connected ? (
        <div style={sectionStyle}>
          <div>
            <label style={labelStyle}>
              System User Access Token
              <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer"
                style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                Meta for Developers <ExternalLinkIcon size="xs" />
              </a>
            </label>
            <input type="password" value={form.accessToken} onChange={e => setField('accessToken', e.target.value)}
              placeholder="EAABsbCS…" style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Phone Number ID</label>
              <input type="text" value={form.phoneNumberId} onChange={e => setField('phoneNumberId', e.target.value)}
                placeholder="123456789012345" style={{ ...inputStyle, width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Business Account ID (optional)</label>
              <input type="text" value={form.businessAccountId} onChange={e => setField('businessAccountId', e.target.value)}
                placeholder="987654321…" style={{ ...inputStyle, width: '100%' }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Webhook Verify Token (choose any string)</label>
            <input type="text" value={form.webhookVerifyToken} onChange={e => setField('webhookVerifyToken', e.target.value)}
              placeholder="taskara_webhook" style={{ ...inputStyle, width: '100%' }} />
          </div>
          <Button onClick={handleConnect} loading={loading} disabled={!form.accessToken || !form.phoneNumberId || loading}>
            Connect WhatsApp
          </Button>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Requires a Meta Business account with WhatsApp Business API access.
          </p>
        </div>
      ) : (
        <div style={sectionStyle}>
          {profile && (
            <div style={{ fontSize: '13px', color: 'var(--success)' }}>
              Connected: <strong>{profile.businessName}</strong> · {profile.phoneNumber}
            </div>
          )}

          {/* Webhook URL */}
          <div style={{ padding: '12px', background: 'var(--surface-alt)', borderRadius: 'var(--radius)', fontSize: '12px' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>
              Configure this webhook URL in Meta for Developers:
            </div>
            <code style={{ color: 'var(--primary)', wordBreak: 'break-all' }}>{webhookUrl}</code>
            <br />
            <span style={{ color: 'var(--text-muted)' }}>
              Users can create tasks by texting: <strong>create task: [title]</strong>
            </span>
          </div>

          {/* Test send */}
          <div>
            <label style={labelStyle}>Send a test message (phone with country code, no +)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={testTo} onChange={e => setTestTo(e.target.value)}
                placeholder="12025551234" style={{ width: '160px', ...inputStyle, flex: 'none' }} />
              <input type="text" value={testMsg} onChange={e => setTestMsg(e.target.value)}
                placeholder="Test message…" style={inputStyle} />
              <Button onClick={handleSendTest} loading={loading} disabled={loading}>
                <SendIcon size="xs" /> Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </IntegrationCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ClickUp Section
// ══════════════════════════════════════════════════════════════════════════════

function ClickUpSection({ connected, onConnected, onDisconnect }) {
  const [apiKey, setApiKey]   = useState('');
  const [loading, setLoading] = useState(false);
  const [teams, setTeams]     = useState([]);
  const [spaces, setSpaces]   = useState([]);
  const [lists, setLists]     = useState([]);
  const [selectedTeam, setSelectedTeam]   = useState('');
  const [selectedSpace, setSelectedSpace] = useState('');
  const [selectedList, setSelectedList]   = useState('');
  const [syncResult, setSyncResult]       = useState(null);
  const [teamName, setTeamName]           = useState('');

  const handleConnect = async () => {
    if (!apiKey.trim()) return toast.error('Enter your ClickUp API Key');
    setLoading(true);
    try {
      const data = await api.cuConnect({ apiKey: apiKey.trim() });
      const t = data.profile?.teams || [];
      setTeams(t);
      setTeamName(t[0]?.name || '');
      onConnected();
      toast.success(`Connected to ${t[0]?.name || 'ClickUp'}`);
      setApiKey('');
      if (t[0]?.id) loadSpaces(t[0].id);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'ClickUp connection failed');
    } finally { setLoading(false); }
  };

  const loadSpaces = async (teamId) => {
    try {
      const data = await api.cuSpaces(teamId);
      setSpaces(data.spaces || []);
    } catch (e) { toast.error('Failed to load spaces'); }
  };

  const loadLists = async (spaceId) => {
    setLoading(true);
    try {
      const data = await api.cuLists(spaceId);
      setLists(data.lists || []);
    } catch (e) { toast.error('Failed to load lists'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (connected) {
      api.cuSettings().then(data => {
        const s = data.settings;
        if (s?.clickup?.teamId) {
          setTeamName(s.clickup.teamName || '');
          loadSpaces(s.clickup.teamId);
        }
      }).catch(() => {});
    }
  }, [connected]);

  const handleSync = async () => {
    if (!selectedList) return toast.error('Select a list to sync');
    setLoading(true); setSyncResult(null);
    try {
      const data = await api.cuSync(selectedList);
      setSyncResult(data);
      toast.success(`Imported ${data.imported} tasks from ClickUp`);
    } catch (e) { toast.error(e.response?.data?.error || 'Sync failed'); }
    finally { setLoading(false); }
  };

  return (
    <IntegrationCard
      logo={<ClickUpLogo />}
      name="ClickUp"
      description="Sync tasks from ClickUp lists and export tasks back to ClickUp."
      connected={connected}
      onDisconnect={onDisconnect}
    >
      {!connected ? (
        <div style={sectionStyle}>
          <label style={labelStyle}>
            ClickUp Personal API Token
            <a href="https://app.clickup.com/settings/apps" target="_blank" rel="noopener noreferrer"
              style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              Get token <ExternalLinkIcon size="xs" />
            </a>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder="pk_…" style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleConnect()} />
            <Button onClick={handleConnect} loading={loading} disabled={!apiKey.trim() || loading}>
              Connect
            </Button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Find your API Token under ClickUp Settings → Apps → API Token.
          </p>
        </div>
      ) : (
        <div style={sectionStyle}>
          {teamName && (
            <div style={{ fontSize: '13px', color: 'var(--success)' }}>
              Connected to <strong>{teamName}</strong>
            </div>
          )}

          {/* Space → List cascade */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={labelStyle}>Space</label>
              <select value={selectedSpace} onChange={e => { setSelectedSpace(e.target.value); setSelectedList(''); loadLists(e.target.value); }}
                style={{ ...inputStyle, width: '100%' }}>
                <option value="">Select space…</option>
                {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={labelStyle}>List</label>
              <select value={selectedList} onChange={e => setSelectedList(e.target.value)}
                style={{ ...inputStyle, width: '100%' }} disabled={!selectedSpace}>
                <option value="">Select list…</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.folder ? `${l.folder} / ` : ''}{l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button onClick={handleSync} loading={loading} disabled={!selectedList || loading}>
            <SyncIcon size="xs" /> Sync List → Tasks
          </Button>

          {syncResult && <ImportResult result={syncResult} />}

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Tasks are imported with priority, status, due dates, and tags mapped automatically.
          </p>
        </div>
      )}
    </IntegrationCard>
  );
}
