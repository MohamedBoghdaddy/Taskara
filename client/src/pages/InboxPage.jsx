import React, { useState, useEffect } from 'react';
import { getInbox, createInboxItem, updateInboxItem, convertInboxItem } from '../api/inbox';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  InboxIcon, NoteIcon, TaskIcon, ReminderIcon, BacklinkIcon,
  AIIcon, CheckCircleIcon, ArchiveIcon, AddIcon, FilterIcon,
} from '../components/common/Icons';

const TYPE_ICONS = {
  note:     <NoteIcon />,
  task:     <TaskIcon />,
  idea:     <AIIcon />,
  link:     <BacklinkIcon />,
  reminder: <ReminderIcon />,
};

export default function InboxPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('idea');
  const [content, setContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [converting, setConverting] = useState(null);
  const [filter, setFilter] = useState('unprocessed');

  useEffect(() => { loadItems(); }, [filter]);

  const loadItems = async () => {
    setLoading(true);
    try { const d = await getInbox({ status: filter }); setItems(d.items || []); }
    catch { toast.error('Failed to load inbox'); }
    finally { setLoading(false); }
  };

  const handleCapture = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const item = await createInboxItem({ title, type, content });
      setItems(prev => [item, ...prev]);
      setTitle(''); setContent(''); setShowForm(false);
      toast.success('Captured!');
    } catch { toast.error('Failed to capture'); }
  };

  const handleArchive = async (id) => {
    try { await updateInboxItem(id, { status: 'archived' }); setItems(prev => prev.filter(i => i._id !== id)); }
    catch { toast.error('Failed to archive'); }
  };

  const handleConvert = async (item, targetType) => {
    try {
      await convertInboxItem(item._id, { targetType });
      setItems(prev => prev.filter(i => i._id !== item._id));
      toast.success(`Converted to ${targetType}!`);
      setConverting(null);
    } catch { toast.error('Conversion failed'); }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <InboxIcon color="var(--primary)" /> Inbox
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>Capture first, process later</p>
        </div>
        <Tooltip content="Capture a new item" placement="left">
          <Button onClick={() => setShowForm(true)}>
            <AddIcon size="xs" style={{ marginRight: '4px' }} /> Capture
          </Button>
        </Tooltip>
      </div>

      <FeatureGuide
        storageKey="inbox-guide"
        title="Inbox"
        icon={<InboxIcon />}
        description="Capture anything quickly — ideas, tasks, links, reminders — then process them at your own pace."
        steps={[
          {
            icon: <AddIcon />,
            title: 'Capture items',
            body: 'Use the quick-capture bar to add ideas, notes, tasks or links. Choose a type from the dropdown.',
          },
          {
            icon: <CheckCircleIcon />,
            title: 'Mark all read',
            body: 'Convert unprocessed items to tasks or notes, or archive them to keep the inbox clean.',
          },
          {
            icon: <FilterIcon />,
            title: 'Filter by type',
            body: 'Switch between Unprocessed, Processed, and Archived tabs to find exactly what you need.',
          },
        ]}
        tips={[
          'Use "idea" type for quick thoughts — convert later',
          'Inbox zero: process everything into tasks or notes',
          'Archived items are never deleted, just hidden',
        ]}
        accentColor="var(--primary)"
      />

      {/* Quick capture bar */}
      <form onSubmit={handleCapture} style={{ display: 'flex', gap: '8px', marginBottom: '20px', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <select value={type} onChange={e => setType(e.target.value)} style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}>
          {['idea','task','note','link','reminder'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Capture something..." style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} />
        <Button type="submit" size="sm">Save</Button>
      </form>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {['unprocessed','processed','archived'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '13px', fontWeight: filter === s ? '600' : '400', background: filter === s ? 'var(--primary)' : 'var(--surface-alt)', color: filter === s ? '#fff' : 'var(--text-secondary)' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <CheckCircleIcon color="var(--success)" /> Inbox is empty
            </div>
          )}
          {items.map(item => (
            <div key={item._id} style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '16px', marginTop: '1px', color: 'var(--primary)' }}>{TYPE_ICONS[item.type] || <TaskIcon />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>{item.title}</div>
                {item.content && <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.content}</div>}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(item.createdAt).toLocaleDateString()}</div>
              </div>
              {filter === 'unprocessed' && (
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <Tooltip content="Convert to task" placement="top">
                    <Button size="sm" variant="secondary" onClick={() => handleConvert(item, 'task')}>
                      <TaskIcon size="xs" style={{ marginRight: '4px' }} /> Task
                    </Button>
                  </Tooltip>
                  <Tooltip content="Convert to note" placement="top">
                    <Button size="sm" variant="secondary" onClick={() => handleConvert(item, 'note')}>
                      <NoteIcon size="xs" style={{ marginRight: '4px' }} /> Note
                    </Button>
                  </Tooltip>
                  <Tooltip content="Archive item" placement="top">
                    <Button size="sm" variant="ghost" onClick={() => handleArchive(item._id)}>
                      <ArchiveIcon size="xs" />
                    </Button>
                  </Tooltip>
                </div>
              )}
            </div>
          ))}
        </div>
      }
    </div>
  );
}
