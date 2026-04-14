import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDatabases, createDatabase } from '../api/index';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  LayersIcon, AddIcon, EyeIcon, EditIcon, FilterIcon,
  ListIcon, CloseIcon, SaveIcon, InfoIcon,
  TableIcon, GridIcon, GalleryIcon, LoadingIcon, DatabaseIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

const VIEW_TYPES = [
  { key: 'grid',    Icon: GridIcon,    label: 'Grid' },
  { key: 'table',   Icon: TableIcon,   label: 'Table' },
  { key: 'gallery', Icon: GalleryIcon, label: 'Gallery' },
];

export default function DatabasesPage() {
  const [dbs, setDbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon: '' });
  const [viewType, setViewType] = useState('grid');

  useEffect(() => {
    getDatabases()
      .then(setDbs)
      .catch(() => toast.error('Failed to load databases'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const db = await createDatabase(form);
      setDbs(prev => [db, ...prev]);
      setShowCreate(false);
      setForm({ name: '', description: '', icon: '' });
      toast.success('Database created');
    } catch { toast.error('Failed to create'); }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>

      <FeatureGuide
        storageKey="databases-guide"
        title="Databases"
        icon={<LayersIcon />}
        description="Databases let you build custom structured tables — think Notion databases. Each database has its own fields, views, and records that you define."
        steps={[
          { icon: <LayersIcon size="xs" />, title: 'What is a database?', body: 'A database is a custom schema with named fields (text, number, date, select…) and any number of records.' },
          { icon: <AddIcon size="xs" />, title: 'Create a database', body: 'Click "+ New Database", give it a name and optional icon, then add fields inside it.' },
          { icon: <EditIcon size="xs" />, title: 'Add fields', body: 'Open the database and use the Fields panel to add text, number, date, select or checkbox columns.' },
          { icon: <EyeIcon size="xs" />, title: 'Switch views', body: 'Each database supports Table and Gallery views. Use the view switcher inside the database detail page.' },
          { icon: <FilterIcon size="xs" />, title: 'Filter & sort', body: 'Apply filters and sort orders on any field to slice your data just the way you need it.' },
        ]}
        tips={[
          'Give databases a unique emoji icon for quick recognition',
          'Use select fields to create status columns',
          'Databases can be linked to tasks and notes',
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LayersIcon style={{ color: 'var(--primary)' }} />
          Databases
          <Tooltip content="Custom structured tables — define fields and store records in any shape you need." placement="right">
            <span style={{ color: 'var(--text-muted)', display: 'flex', cursor: 'default' }}><InfoIcon size="xs" /></span>
          </Tooltip>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* View switcher */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {VIEW_TYPES.map(({ key, Icon, label }) => (
              <Tooltip key={key} content={`${label} view`} placement="bottom">
                <button
                  onClick={() => setViewType(key)}
                  style={{ padding: '6px 10px', border: 'none', cursor: 'pointer', background: viewType === key ? 'var(--primary)' : 'var(--surface)', color: viewType === key ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                >
                  <Icon size="sm" />
                </button>
              </Tooltip>
            ))}
          </div>
          <Tooltip content="Create a new database" placement="left">
            <Button onClick={() => setShowCreate(true)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AddIcon size="sm" /> New Database
              </span>
            </Button>
          </Tooltip>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <LoadingIcon /> Loading databases…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: viewType === 'table' ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }}>
          {dbs.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              <DatabaseIcon style={{ fontSize: '36px', opacity: 0.35, display: 'block', margin: '0 auto 12px' }} />
              No databases yet.{' '}
              <button onClick={() => setShowCreate(true)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
                Create one →
              </button>
            </div>
          )}
          {dbs.map(db => (
            <Link key={db._id} to={`/databases/${db._id}`} style={{ textDecoration: 'none' }}>
              <div
                style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontSize: '26px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: 'var(--primary-soft)', borderRadius: '8px', color: 'var(--primary)' }}>
                  {db.icon ? db.icon : <LayersIcon />}
                </div>
                <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>{db.name}</div>
                {db.description && (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{db.description}</p>
                )}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <TableIcon size="xs" /> {db.fields?.length || 0} fields
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <ListIcon size="xs" /> {db.recordCount || 0} rows
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Database">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Input label="Icon (emoji)" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="e.g. an emoji like a clipboard or folder" />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CloseIcon size="xs" /> Cancel</span>
            </Button>
            <Button type="submit">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><SaveIcon size="xs" /> Create</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
