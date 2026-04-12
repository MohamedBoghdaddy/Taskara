import React, { useState } from 'react';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import client from '../api/client';
import { PlugIcon, CloudIcon, CheckCircleIcon, CloseIcon, ExternalLinkIcon } from '../components/common/Icons';

// ── API helpers ───────────────────────────────────────────────────────────────
const importTodoist      = (apiToken)       => client.post('/integrations/todoist/import', { apiToken }).then(r => r.data);
const testSlackWebhook   = (webhookUrl)     => client.post('/integrations/slack/test', { webhookUrl }).then(r => r.data);
const sendSlackNotify    = (webhookUrl, message) => client.post('/integrations/slack/notify', { webhookUrl, message }).then(r => r.data);

// ── Integration card ──────────────────────────────────────────────────────────
function IntegrationCard({ logo, name, description, status, children }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '10px',
          background: 'var(--surface-alt)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', flexShrink: 0,
        }}>
          {logo}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>{name}</h3>
            {status === 'connected' && (
              <span style={{
                fontSize: '11px', fontWeight: '600', padding: '2px 8px',
                background: 'var(--success)18', color: 'var(--success)',
                borderRadius: '10px', border: '1px solid var(--success)44',
              }}>
                Connected
              </span>
            )}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  // Todoist
  const [todoistToken, setTodoistToken]     = useState('');
  const [todoistLoading, setTodoistLoading] = useState(false);
  const [todoistResult, setTodoistResult]   = useState(null);

  // Slack
  const [slackUrl, setSlackUrl]             = useState('');
  const [slackMsg, setSlackMsg]             = useState('');
  const [slackLoading, setSlackLoading]     = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);

  const handleTodoistImport = async () => {
    if (!todoistToken.trim()) return toast.error('Enter your Todoist API token');
    setTodoistLoading(true);
    setTodoistResult(null);
    try {
      const result = await importTodoist(todoistToken.trim());
      setTodoistResult(result);
      toast.success(`Imported ${result.imported} tasks from Todoist`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Todoist import failed');
    } finally {
      setTodoistLoading(false);
    }
  };

  const handleSlackTest = async () => {
    if (!slackUrl.trim()) return toast.error('Enter your Slack webhook URL');
    setSlackLoading(true);
    try {
      await testSlackWebhook(slackUrl.trim());
      setSlackConnected(true);
      toast.success('Slack test message sent!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Slack test failed');
    } finally {
      setSlackLoading(false);
    }
  };

  const handleSlackSend = async () => {
    if (!slackUrl.trim()) return toast.error('Enter your Slack webhook URL');
    if (!slackMsg.trim()) return toast.error('Enter a message to send');
    setSlackLoading(true);
    try {
      await sendSlackNotify(slackUrl.trim(), slackMsg.trim());
      toast.success('Message sent to Slack!');
      setSlackMsg('');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send Slack message');
    } finally {
      setSlackLoading(false);
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '720px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <PlugIcon style={{ fontSize: '20px', color: 'var(--primary)' }} />
        <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>Integrations</h1>
      </div>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
        Connect Taskara with your favourite tools to sync tasks and send notifications.
      </p>

      {/* ── Todoist ── */}
      <IntegrationCard
        logo="✅"
        name="Todoist"
        description="Import your tasks from Todoist into Taskara with one click."
        status={todoistResult ? 'connected' : undefined}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Todoist API Token
            <a
              href="https://app.todoist.com/app/settings/integrations/developer"
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              Get token <ExternalLinkIcon size="xs" />
            </a>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="password"
              value={todoistToken}
              onChange={e => setTodoistToken(e.target.value)}
              placeholder="Paste your Todoist API token…"
              style={{
                flex: 1, padding: '9px 12px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', background: 'var(--surface-alt)',
                color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
              }}
            />
            <Button onClick={handleTodoistImport} loading={todoistLoading} disabled={!todoistToken.trim() || todoistLoading}>
              Import Tasks
            </Button>
          </div>

          {todoistResult && (
            <div style={{
              display: 'flex', gap: '20px', padding: '12px 16px',
              background: 'var(--success)10', border: '1px solid var(--success)44',
              borderRadius: 'var(--radius)', fontSize: '13px',
            }}>
              <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircleIcon size="xs" /> {todoistResult.imported} imported
              </span>
              <span style={{ color: 'var(--text-muted)' }}>{todoistResult.skipped} skipped (already exist)</span>
              <span style={{ color: 'var(--text-secondary)' }}>{todoistResult.total} total</span>
            </div>
          )}

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Your API token is sent directly to the server and never stored. Tasks are imported as "Todo" status.
          </p>
        </div>
      </IntegrationCard>

      {/* ── Slack ── */}
      <IntegrationCard
        logo="💬"
        name="Slack"
        description="Send task and sprint notifications to your Slack channels via Incoming Webhooks."
        status={slackConnected ? 'connected' : undefined}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Slack Incoming Webhook URL
            <a
              href="https://api.slack.com/messaging/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              Create webhook <ExternalLinkIcon size="xs" />
            </a>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="url"
              value={slackUrl}
              onChange={e => setSlackUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/…"
              style={{
                flex: 1, padding: '9px 12px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', background: 'var(--surface-alt)',
                color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
              }}
            />
            <Button variant="secondary" onClick={handleSlackTest} loading={slackLoading} disabled={!slackUrl.trim() || slackLoading}>
              Test
            </Button>
          </div>

          {slackConnected && (
            <>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Send a custom message
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={slackMsg}
                  onChange={e => setSlackMsg(e.target.value)}
                  placeholder="Type a message to send to Slack…"
                  onKeyDown={e => e.key === 'Enter' && handleSlackSend()}
                  style={{
                    flex: 1, padding: '9px 12px', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', background: 'var(--surface-alt)',
                    color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
                  }}
                />
                <Button onClick={handleSlackSend} loading={slackLoading} disabled={!slackMsg.trim() || slackLoading}>
                  Send
                </Button>
              </div>
            </>
          )}

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            <p style={{ margin: '0 0 4px' }}>
              Taskara can also post to Slack automatically when tasks or sprints change — configure that in{' '}
              <a href="/automations" style={{ color: 'var(--primary)' }}>Automations</a>.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Slash command:</strong> Add <code style={{ background: 'var(--surface-alt)', padding: '1px 5px', borderRadius: '4px' }}>/taskara</code> to your Slack workspace
              and point it to <code style={{ background: 'var(--surface-alt)', padding: '1px 5px', borderRadius: '4px' }}>{window.location.origin}/api/integrations/slack/slash-command</code>.
            </p>
          </div>
        </div>
      </IntegrationCard>

      {/* ── Coming soon ── */}
      {[
        { logo: '🔗', name: 'GitHub', description: 'Link commits and PRs to tasks automatically.' },
        { logo: '📅', name: 'Google Calendar', description: 'Sync task due dates with your Google Calendar.' },
        { logo: '🗂️', name: 'Notion', description: 'Import pages and databases from Notion.' },
      ].map(({ logo, name, description }) => (
        <IntegrationCard key={name} logo={logo} name={name} description={description}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', color: 'var(--text-muted)',
            background: 'var(--surface-alt)', padding: '5px 12px',
            borderRadius: '20px', border: '1px solid var(--border)',
          }}>
            <CloudIcon size="xs" /> Coming soon
          </div>
        </IntegrationCard>
      ))}
    </div>
  );
}
