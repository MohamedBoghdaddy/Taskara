import React, { useState, useEffect } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api/index';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  TaskIcon, ProjectIcon, CalendarIcon, LayersIcon, ListIcon,
  AddIcon, EditIcon, DeleteIcon, SaveIcon, CloseIcon, CheckIcon,
  InfoIcon, TagIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

const TEMPLATE_TYPES = ['note', 'daily_note', 'task', 'project', 'database'];

const TYPE_ICON_MAP = {
  note: <ListIcon size="sm" />,
  daily_note: <CalendarIcon size="sm" />,
  task: <TaskIcon size="sm" />,
  project: <ProjectIcon size="sm" />,
  database: <LayersIcon size="sm" />,
};

const TYPE_ICON_LARGE = {
  note: <ListIcon size="lg" />,
  daily_note: <CalendarIcon size="lg" />,
  task: <TaskIcon size="lg" />,
  project: <ProjectIcon size="lg" />,
  database: <LayersIcon size="lg" />,
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'note', description: '', content: '', isDefault: false });

  useEffect(() => {
    getTemplates({ type: typeFilter || undefined })
      .then(setTemplates)
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false));
  }, [typeFilter]);

  const openCreate = () => {
    setForm({ name: '', type: typeFilter || 'note', description: '', content: '', isDefault: false });
    setEditing(null);
    setShowCreate(true);
  };

  const openEdit = (t) => {
    setForm({ name: t.name, type: t.type, description: t.description || '', content: typeof t.content === 'string' ? t.content : '', isDefault: t.isDefault });
    setEditing(t);
    setShowCreate(true);
  };

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
    try {
      await deleteTemplate(id);
      setTemplates(ts => ts.filter(t => t._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>

      <FeatureGuide
        storageKey="templates-guide"
        title="Templates"
        icon={<TagIcon />}
        description="Templates give you a head start by pre-filling content for notes, tasks, projects and more. Built-in templates ship with Taskara; custom ones belong to you."
        steps={[
          { icon: <LayersIcon size="xs" />, title: 'Built-in vs Custom', body: 'Built-in templates are marked DEFAULT and cannot be deleted. Custom templates are fully editable.' },
          { icon: <AddIcon size="xs" />, title: 'Create a template', body: 'Click "+ New Template", choose a type, add content in Markdown, then save.' },
          { icon: <CheckIcon size="xs" />, title: 'Use a template', body: 'When creating a note or task, pick a template from the dropdown to auto-fill its content.' },
          { icon: <EditIcon size="xs" />, title: 'Edit & organise', body: 'Use the type filter pills to browse by category, then edit or delete your custom templates.' },
        ]}
        tips={[
          'Markdown is fully supported in template content',
          'Mark a template as default to make it pre-selected for its type',
          'Use "daily_note" templates for journal or standup formats',
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TagIcon style={{ color: 'var(--primary)' }} />
          Templates
        </h1>
        <Button onClick={openCreate}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AddIcon size="sm" /> New Template
          </span>
        </Button>
      </div>

      {/* Type filter pills */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setTypeFilter('')}
          style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', background: !typeFilter ? 'var(--primary)' : 'var(--surface-alt)', color: !typeFilter ? '#fff' : 'var(--text-secondary)' }}
        >
          All
        </button>
        {TEMPLATE_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', background: typeFilter === t ? 'var(--primary)' : 'var(--surface-alt)', color: typeFilter === t ? '#fff' : 'var(--text-secondary)' }}
          >
            {TYPE_ICON_MAP[t]} {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {templates.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              No templates yet.{' '}
              <button onClick={openCreate} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
                Create one →
              </button>
            </div>
          )}
          {templates.map(t => (
            <div
              key={t._id}
              style={{ padding: '18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', position: 'relative' }}
            >
              {t.isDefault && (
                <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', background: 'var(--primary-soft)', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckIcon size="xs" /> DEFAULT
                </span>
              )}
              <div style={{ fontSize: '22px', marginBottom: '8px', color: 'var(--primary)' }}>
                {TYPE_ICON_LARGE[t.type]}
              </div>
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{t.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'capitalize' }}>
                {t.type.replace('_', ' ')}
              </div>
              {t.description && (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {t.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: '6px' }}>
                <Tooltip content="Edit this template" placement="top">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(t)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><EditIcon size="xs" /> Edit</span>
                  </Button>
                </Tooltip>
                <Tooltip content="Delete this template" placement="top">
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(t._id)} style={{ color: 'var(--error)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><DeleteIcon size="xs" /> Delete</span>
                  </Button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={editing ? 'Edit Template' : 'New Template'}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Type</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            >
              {TEMPLATE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Content</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={6}
              placeholder="Template content (Markdown supported)"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} style={{ accentColor: 'var(--primary)' }} />
            Set as default for this type
          </label>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CloseIcon size="xs" /> Cancel</span>
            </Button>
            <Button type="submit">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><SaveIcon size="xs" /> Save</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
