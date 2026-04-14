import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDatabase, getRecords, createRecord, updateRecord, deleteRecord } from '../api/index';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  LayersIcon, AddIcon, EditIcon, DeleteIcon, SaveIcon, CloseIcon,
  ListIcon, EyeIcon, ArrowLeft, CheckIcon, FilterIcon, SortIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

const VIEW_MODES = [
  { id: 'table', label: 'Table', icon: <ListIcon size="xs" /> },
  { id: 'gallery', label: 'Gallery', icon: <EyeIcon size="xs" /> },
];

export default function DatabaseDetailPage() {
  const { id } = useParams();
  const [db, setDb] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [detailRecord, setDetailRecord] = useState(null);

  useEffect(() => {
    Promise.all([
      getDatabase(id).then(setDb),
      getRecords(id, {}).then(d => setRecords(d.records || [])),
    ])
      .catch(() => toast.error('Failed to load database'))
      .finally(() => setLoading(false));
  }, [id]);

  const openCreate = () => { setForm({}); setEditing(null); setShowCreate(true); };
  const openEdit = (rec) => { setForm({ ...rec.values }); setEditing(rec); setShowCreate(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const updated = await updateRecord(id, editing._id, form);
        setRecords(rs => rs.map(r => r._id === editing._id ? updated : r));
        toast.success('Updated');
      } else {
        const created = await createRecord(id, { values: form });
        setRecords(rs => [created, ...rs]);
        toast.success('Record created');
      }
      setShowCreate(false);
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async (recId) => {
    if (!window.confirm('Delete record?')) return;
    try {
      await deleteRecord(id, recId);
      setRecords(rs => rs.filter(r => r._id !== recId));
      if (detailRecord?._id === recId) setDetailRecord(null);
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return (
    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
  );
  if (!db) return (
    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--error)' }}>Database not found</div>
  );

  const fieldInputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>

      {/* Back */}
      <div style={{ marginBottom: '16px' }}>
        <Link to="/databases" style={{ color: 'var(--text-muted)', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
          <ArrowLeft size="xs" /> Databases
        </Link>
      </div>

      <FeatureGuide
        storageKey="database-detail-guide"
        title="Database Detail"
        icon={<LayersIcon />}
        description="Each database lets you store and view structured records. Switch between Table and Gallery views, click any row to open a detail drawer, and edit inline."
        steps={[
          { icon: <ListIcon size="xs" />, title: 'Table view', body: 'See all records in a spreadsheet-style grid. Rows are records; columns are the fields you defined.' },
          { icon: <EyeIcon size="xs" />, title: 'Gallery view', body: 'Each record becomes a card. Great for image-heavy or card-based workflows.' },
          { icon: <EditIcon size="xs" />, title: 'Inline editing', body: 'Click the Edit button on any row to open a form and change field values directly.' },
          { icon: <AddIcon size="xs" />, title: 'Record drawer', body: 'Click a row title to open the detail drawer with the full record and all field values.' },
        ]}
        tips={[
          'Use Table view for data-heavy databases',
          'Gallery view works best when records have an image or title field',
          'Required fields are marked with *',
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {db.icon ? (
            <span style={{ fontSize: '22px' }}>{db.icon}</span>
          ) : (
            <LayersIcon style={{ color: 'var(--primary)' }} />
          )}
          {db.name}
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Filter & sort */}
          <Tooltip content="Filter records" placement="bottom">
            <button style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
              <FilterIcon size="xs" /> Filter
            </button>
          </Tooltip>
          <Tooltip content="Sort records" placement="bottom">
            <button style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
              <SortIcon size="xs" /> Sort
            </button>
          </Tooltip>
          {/* View switcher */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {VIEW_MODES.map(vm => (
              <Tooltip key={vm.id} content={`Switch to ${vm.label} view`} placement="bottom">
                <button
                  onClick={() => setViewMode(vm.id)}
                  style={{ padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', background: viewMode === vm.id ? 'var(--primary)' : 'var(--surface)', color: viewMode === vm.id ? '#fff' : 'var(--text-secondary)', transition: 'background 0.15s' }}
                >
                  {vm.icon} {vm.label}
                </button>
              </Tooltip>
            ))}
          </div>
          <Tooltip content="Add a new record" placement="left">
            <Button onClick={openCreate}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AddIcon size="sm" /> New Record
              </span>
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Table view */}
      {viewMode === 'table' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-alt)' }}>
                {db.fields.map(f => (
                  <th key={f.key} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    {f.label}
                  </th>
                ))}
                <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', width: '100px' }} />
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr>
                  <td colSpan={db.fields.length + 1} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    No records yet. Add the first one!
                  </td>
                </tr>
              )}
              {records.map(rec => (
                <tr
                  key={rec._id}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  {db.fields.map((f, fi) => (
                    <td
                      key={f.key}
                      style={{ padding: '10px 14px', fontSize: '14px', color: 'var(--text-primary)' }}
                      onClick={() => fi === 0 && setDetailRecord(rec)}
                    >
                      {f.type === 'checkbox'
                        ? (rec.values?.[f.key] ? <CheckIcon size="xs" style={{ color: 'var(--success)' }} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>)
                        : rec.values?.[f.key] ?? '—'}
                    </td>
                  ))}
                  <td style={{ padding: '8px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Tooltip content="Edit record" placement="left">
                        <button
                          onClick={() => openEdit(rec)}
                          style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          <EditIcon size="xs" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Delete record" placement="left">
                        <button
                          onClick={() => handleDelete(rec._id)}
                          style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          <DeleteIcon size="xs" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Gallery view */}
      {viewMode === 'gallery' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {records.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              No records yet.
            </div>
          )}
          {records.map(rec => (
            <div
              key={rec._id}
              onClick={() => setDetailRecord(rec)}
              style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {db.fields.slice(0, 3).map(f => (
                <div key={f.key} style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{f.label}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: f === db.fields[0] ? '600' : '400' }}>
                    {f.type === 'checkbox'
                      ? (rec.values?.[f.key] ? <CheckIcon size="xs" style={{ color: 'var(--success)' }} /> : '—')
                      : rec.values?.[f.key] ?? '—'}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
                <Tooltip content="Edit record" placement="top">
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(rec); }}
                    style={{ padding: '3px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <EditIcon size="xs" />
                  </button>
                </Tooltip>
                <Tooltip content="Delete record" placement="top">
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(rec._id); }}
                    style={{ padding: '3px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <DeleteIcon size="xs" />
                  </button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record detail drawer */}
      {detailRecord && (
        <div
          style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '380px', background: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 200, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Record Detail</h3>
            <Tooltip content="Close drawer" placement="left">
              <button onClick={() => setDetailRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <CloseIcon size="sm" />
              </button>
            </Tooltip>
          </div>
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            {db.fields.map(f => (
              <div key={f.key} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.label}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  {f.type === 'checkbox'
                    ? (detailRecord.values?.[f.key] ? <CheckIcon size="xs" style={{ color: 'var(--success)' }} /> : <span style={{ color: 'var(--text-muted)' }}>No</span>)
                    : detailRecord.values?.[f.key] ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => { openEdit(detailRecord); setDetailRecord(null); }} style={{ flex: 1 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><EditIcon size="xs" /> Edit</span>
            </Button>
            <Tooltip content="Delete this record" placement="top">
              <Button variant="ghost" onClick={() => handleDelete(detailRecord._id)} style={{ color: 'var(--error)' }}>
                <DeleteIcon size="xs" />
              </Button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={editing ? 'Edit Record' : 'New Record'}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {db.fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                {f.label}{f.required && ' *'}
              </label>
              {f.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={!!form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.checked }))}
                  style={{ accentColor: 'var(--primary)' }}
                />
              ) : f.type === 'select' ? (
                <select
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={fieldInputStyle}
                >
                  <option value="">Select...</option>
                  {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  required={f.required}
                  style={fieldInputStyle}
                />
              )}
            </div>
          ))}
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
