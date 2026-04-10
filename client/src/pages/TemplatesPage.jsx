import React, { useState, useEffect } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api/index';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';

const TEMPLATE_TYPES = ['note', 'daily_note', 'task', 'project', 'database'];
const TYPE_ICONS = { note: '📝', daily_note: '📅', task: '✓', project: '📁', database: '🗄️' };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'note', description: '', content: '', isDefault: false });

  useEffect(() => {
    getTemplates({ type: typeFilter || undefined }).then(setTemplates).catch(() => toast.error('Failed to load templates')).finally(() => setLoading(false));
  }, [typeFilter]);

  const openCreate = () => { setForm({ name: '', type: typeFilter || 'note', description: '', content: '', isDefault: false }); setEditing(null); setShowCreate(true); };
  const openEdit = (t) => { setForm({ name: t.name, type: t.type, description: t.description || '', content: typeof t.content === 'string' ? t.content : '', isDefault: t.isDefault }); setEditing(t); setShowCreate(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const updated = await updateTemplate(editing._id, form);
        setTemplates(ts => ts.map(t => t._id === editing._id ? updated : t));
        toast.success('Template updated');
      } else {
        const created = await createTemplate(form);
        setTemplates(ts => [created, ...ts]);
        toast.success('Template created');
      }
      setShowCreate(false);
    } catch { toast.error('Failed to save template'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete template?')) return;
    try { await deleteTemplate(id); setTemplates(ts => ts.filter(t => t._id !== id)); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Templates</h1>
        <Button onClick={openCreate}>+ New Template</Button>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setTypeFilter('')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', background: !typeFilter ? 'var(--primary)' : 'var(--surface-alt)', color: !typeFilter ? '#fff' : 'var(--text-secondary)' }}>All</button>
        {TEMPLATE_TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', background: typeFilter === t ? 'var(--primary)' : 'var(--surface-alt)', color: typeFilter === t ? '#fff' : 'var(--text-secondary)' }}>{TYPE_ICONS[t]} {t.replace('_', ' ')}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {templates.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              No templates yet. <button onClick={openCreate} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Create one →</button>
            </div>
          )}
          {templates.map(t => (
            <div key={t._id} style={{ padding: '18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', position: 'relative' }}>
              {t.isDefault && <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', background: 'var(--primary-soft)', color: 'var(--primary)', fontWeight: '600' }}>DEFAULT</span>}
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{TYPE_ICONS[t.type]}</div>
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{t.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'capitalize' }}>{t.type.replace('_', ' ')}</div>
              {t.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{t.description}</p>}
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button size="sm" variant="secondary" onClick={() => openEdit(t)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(t._id)} style={{ color: 'var(--error)' }}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={editing ? 'Edit Template' : 'New Template'}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}>
              {TEMPLATE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Content</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6} placeholder="Template content (Markdown supported)" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'monospace' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} style={{ accentColor: 'var(--primary)' }} />
            Set as default for this type
          </label>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
