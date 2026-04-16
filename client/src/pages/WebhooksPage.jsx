import React, { useState, useEffect } from 'react';
import * as webhooksApi from '../api/webhooks';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import FeatureGuide from '../components/common/FeatureGuide';
import {
  AddIcon, CheckCircleIcon, DeleteIcon, ToggleOnIcon, ToggleOffIcon,
  BroadcastIcon, SendIcon, ShareIcon, GlobeIcon,
} from '../components/common/Icons';

const ALL_EVENTS = [
  'task.created','task.updated','task.completed','task.deleted',
  'note.created','note.updated','note.deleted',
  'card.created','card.moved','card.updated',
  'sprint.started','sprint.completed',
  'project.created','member.invited','member.joined',
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showModal,setShowModal] = useState(false);
  const [form, setForm] = useState({ url: '', description: '', events: ['task.created','task.completed'] });
  const [saving,  setSaving]  = useState(false);
  const [testing, setTesting] = useState(null);

  const load = () => webhooksApi.getWebhooks()
    .then(d => setWebhooks(d.webhooks || []))
    .catch(() => toast.error('Failed to load webhooks'))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.url.trim())    return toast.error('URL is required');
    if (!form.events.length) return toast.error('Select at least one event');
    setSaving(true);
    try {
      await webhooksApi.createWebhook(form);
      toast.success('Webhook created');
      setShowModal(false);
      setForm({ url: '', description: '', events: ['task.created'] });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create webhook'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (wh) => {
    try {
      const updated = await webhooksApi.updateWebhook(wh._id, { active: !wh.active });
      setWebhooks(prev => prev.map(w => w._id === wh._id ? updated : w));
      toast.success(updated.active ? 'Webhook enabled' : 'Webhook disabled');
    } catch { toast.error('Failed'); }
  };

  const handleTest = async (wh) => {
    setTesting(wh._id);
    try {
      await webhooksApi.testWebhook(wh._id);
      toast.success('Test event sent!');
    } catch { toast.error('Test failed — check the URL'); }
    finally { setTesting(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this webhook?')) return;
    try {
      await webhooksApi.deleteWebhook(id);
      setWebhooks(prev => prev.filter(w => w._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  const toggleEvent = (ev) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }));
  };

  return (
    <div style={{ padding: '32px', maxWidth: '860px' }}>
      {/* How to use guide */}
      <FeatureGuide
        storageKey="webhooks-guide"
        title="Webhooks"
        icon={<BroadcastIcon />}
        description="Webhooks let external services receive real-time notifications when events happen in Taskara. Every POST request includes an X-Taskara-Signature header for verification."
        steps={[
          { icon: <AddIcon />,         title: 'Create a webhook', body: 'Click "New Webhook" and enter an HTTPS endpoint URL.' },
          { icon: <ShareIcon />,       title: 'Choose events',    body: 'Select which events to subscribe to (e.g. task.completed).' },
          { icon: <SendIcon />,        title: 'Test it',          body: 'Click "Test" to send a sample payload to your endpoint.' },
          { icon: <CheckCircleIcon />, title: 'Monitor deliveries', body: 'Delivery and failure counts update in real time.' },
        ]}
        tips={[
          'Use HTTPS endpoints only for security',
          'Verify the X-Taskara-Signature header to prevent spoofing',
          'Pause webhooks temporarily without deleting them',
          'Combine with Automations for fully server-side workflows',
        ]}
        accentColor="#3b82f6"
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BroadcastIcon color="#3b82f6" /> Webhooks
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Receive real-time events in your external systems via HTTP POST.</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <AddIcon /> New Webhook
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading…</div>
      ) : webhooks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
          <BroadcastIcon size="3x" style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p>No webhooks yet. Add one to start receiving events.</p>
          <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
            All POST requests include <code>X-Taskara-Signature</code> for verification.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {webhooks.map(wh => (
            <div
              key={wh._id}
              style={{
                padding: '16px', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <GlobeIcon size="xs" color="var(--text-muted)" />
                    <code style={{
                      fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)',
                      background: 'var(--surface-alt)', padding: '2px 7px', borderRadius: '4px',
                    }}>
                      {wh.url}
                    </code>
                    <span style={{
                      fontSize: '11px', padding: '2px 7px', borderRadius: '99px',
                      background: wh.active ? '#16a34a22' : 'var(--surface-alt)',
                      color: wh.active ? 'var(--success)' : 'var(--text-muted)',
                    }}>
                      {wh.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  {wh.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '20px' }}>{wh.description}</div>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px', marginLeft: '20px' }}>
                    {(wh.events || []).map(ev => (
                      <span key={ev} style={{ fontSize: '10px', background: 'var(--primary)18', color: 'var(--primary)', borderRadius: '4px', padding: '1px 6px' }}>{ev}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                  <Button size="sm" variant="secondary" onClick={() => handleTest(wh)} disabled={testing === wh._id}>
                    {testing === wh._id ? 'Sending…' : <><SendIcon size="xs" /> Test</>}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleToggle(wh)}>
                    {wh.active ? <><ToggleOnIcon size="xs" /> Pause</> : <><ToggleOffIcon size="xs" /> Enable</>}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(wh._id)}>
                    <DeleteIcon size="xs" />
                  </Button>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '20px' }}>
                {wh.deliveryCount > 0 && <span>Sent: {wh.deliveryCount} · </span>}
                {wh.failureCount > 0  && <span style={{ color: 'var(--error)' }}>Failed: {wh.failureCount} · </span>}
                {wh.lastTriggeredAt   && <span>Last triggered: {new Date(wh.lastTriggeredAt).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Webhook">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input label="Endpoint URL *" type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://your-server.com/webhook" required />
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What this webhook is for" />
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Events to subscribe to *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {ALL_EVENTS.map(ev => (
                <button
                  key={ev}
                  type="button"
                  onClick={() => toggleEvent(ev)}
                  style={{
                    padding: '4px 10px', borderRadius: 'var(--radius)',
                    border: `1px solid ${form.events.includes(ev) ? 'var(--primary)' : 'var(--border)'}`,
                    background: form.events.includes(ev) ? 'var(--primary)18' : 'var(--surface)',
                    color: form.events.includes(ev) ? 'var(--primary)' : 'var(--text-secondary)',
                    fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Creating…' : 'Create Webhook'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
