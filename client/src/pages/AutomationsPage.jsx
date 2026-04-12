import React, { useState, useEffect } from 'react';
import * as automationsApi from '../api/automations';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';

const TRIGGER_EVENTS = [
  'card.moved','task.created','task.updated','task.status_changed','task.deleted',
  'note.created','note.updated','sprint.started','sprint.completed','due_date.reached',
];
const ACTION_TYPES = [
  { value: 'set_task_field',     label: 'Set task field' },
  { value: 'send_notification',  label: 'Send notification' },
  { value: 'webhook',            label: 'Trigger webhook' },
  { value: 'create_task',        label: 'Create task' },
];

export default function AutomationsPage() {
  const [rules,      setRules]     = useState([]);
  const [templates,  setTemplates] = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [showModal,  setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', trigger: { event: '', filter: '{}' }, actions: [{ type: 'set_task_field', params: '{}' }] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      automationsApi.getAutomations().then(d => setRules(d.rules || [])),
      automationsApi.getTemplates().then(d => setTemplates(d.templates || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const load = () => automationsApi.getAutomations().then(d => setRules(d.rules || [])).catch(() => {});

  const handleToggle = async (rule) => {
    try {
      const updated = await automationsApi.toggleAutomation(rule._id);
      setRules(prev => prev.map(r => r._id === rule._id ? updated : r));
      toast.success(updated.active ? 'Automation enabled' : 'Automation disabled');
    } catch { toast.error('Failed to toggle'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this automation?')) return;
    try {
      await automationsApi.deleteAutomation(id);
      setRules(prev => prev.filter(r => r._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.trigger.event) return toast.error('Name and trigger event required');
    let filter = {}, actions = [];
    try { filter = JSON.parse(form.trigger.filter || '{}'); } catch { return toast.error('Invalid trigger filter JSON'); }
    try {
      actions = form.actions.map(a => ({ type: a.type, params: JSON.parse(a.params || '{}') }));
    } catch { return toast.error('Invalid action params JSON'); }

    setSaving(true);
    try {
      await automationsApi.createAutomation({ name: form.name, description: form.description, trigger: { event: form.trigger.event, filter }, actions });
      toast.success('Automation created');
      setShowModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const applyTemplate = (tpl) => {
    setForm({
      name: tpl.name,
      description: '',
      trigger: { event: tpl.trigger.event, filter: JSON.stringify(tpl.trigger.filter || {}, null, 2) },
      actions: tpl.actions.map(a => ({ type: a.type, params: JSON.stringify(a.params || {}, null, 2) })),
    });
  };

  return (
    <div style={{ padding: '32px', maxWidth: '860px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>⚡ Automations</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Create trigger → action rules to automate repetitive work.</p>
        </div>
        <Button variant="primary" onClick={() => { setForm({ name: '', description: '', trigger: { event: '', filter: '{}' }, actions: [{ type: 'set_task_field', params: '{}' }] }); setShowModal(true); }}>+ New Rule</Button>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Quick Templates</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {templates.map((tpl, i) => (
              <button key={i} onClick={() => { applyTemplate(tpl); setShowModal(true); }} style={{ padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                ⚡ {tpl.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Loading…</div>
      ) : rules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
          <p>No automations yet. Use a template or create your own rule.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rules.map(rule => (
            <div key={rule._id} style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{rule.name}</span>
                  <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '99px', background: rule.active ? '#16a34a22' : 'var(--surface-alt)', color: rule.active ? 'var(--success)' : 'var(--text-muted)' }}>
                    {rule.active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Trigger: <code style={{ background: 'var(--surface-alt)', padding: '1px 5px', borderRadius: '3px' }}>{rule.trigger?.event}</code>
                  {' → '}
                  {rule.actions?.length || 0} action(s)
                </div>
                {rule.runCount > 0 && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Ran {rule.runCount} time(s){rule.lastRunAt ? ` · last ${new Date(rule.lastRunAt).toLocaleDateString()}` : ''}</div>}
                {rule.lastError && <div style={{ fontSize: '11px', color: 'var(--error)', marginTop: '4px' }}>Last error: {rule.lastError}</div>}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                <Button size="sm" variant="secondary" onClick={() => handleToggle(rule)}>{rule.active ? 'Pause' : 'Enable'}</Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(rule._id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Automation Rule">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
          <Input label="Rule name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Auto-complete on Done" required />
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />

          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Trigger Event *</label>
            <select value={form.trigger.event} onChange={e => setForm(f => ({ ...f, trigger: { ...f.trigger, event: e.target.value } }))} style={selectStyle} required>
              <option value="">Select trigger event…</option>
              {TRIGGER_EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Trigger Filter <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>(JSON, optional)</span></label>
            <textarea value={form.trigger.filter} onChange={e => setForm(f => ({ ...f, trigger: { ...f.trigger, filter: e.target.value } }))} rows={2} style={textareaStyle} placeholder='{"status": "done"}' />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Actions</label>
            {form.actions.map((action, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', marginBottom: '8px' }}>
                <select value={action.type} onChange={e => setForm(f => { const a = [...f.actions]; a[i] = { ...a[i], type: e.target.value }; return { ...f, actions: a }; })} style={{ ...selectStyle, marginBottom: '6px' }}>
                  {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <textarea value={action.params} onChange={e => setForm(f => { const a = [...f.actions]; a[i] = { ...a[i], params: e.target.value }; return { ...f, actions: a }; })} rows={2} style={textareaStyle} placeholder='{"field": "status", "value": "done"}' />
                {form.actions.length > 1 && <button type="button" onClick={() => setForm(f => ({ ...f, actions: f.actions.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '12px' }}>Remove action</button>}
              </div>
            ))}
            <button type="button" onClick={() => setForm(f => ({ ...f, actions: [...f.actions, { type: 'send_notification', params: '{}' }] }))} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '13px' }}>+ Add action</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Create Rule'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const selectStyle = { width: '100%', padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '13px' };
const textareaStyle = { width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box', resize: 'vertical' };
