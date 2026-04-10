import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDatabase, getRecords, createRecord, updateRecord, deleteRecord } from '../api/index';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

export default function DatabaseDetailPage() {
  const { id } = useParams();
  const [db, setDb] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    Promise.all([
      getDatabase(id).then(setDb),
      getRecords(id, {}).then(d => setRecords(d.records || [])),
    ]).catch(() => toast.error('Failed to load database')).finally(() => setLoading(false));
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
    try { await deleteRecord(id, recId); setRecords(rs => rs.filter(r => r._id !== recId)); }
    catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!db) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--error)' }}>Database not found</div>;

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '16px' }}><Link to="/databases" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>← Databases</Link></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>{db.icon || '🗄️'} {db.name}</h1>
        <Button onClick={openCreate}>+ New Record</Button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt)' }}>
              {db.fields.map(f => (
                <th key={f.key} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{f.label}</th>
              ))}
              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', width: '80px' }} />
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr><td colSpan={db.fields.length + 1} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No records. Add the first one!</td></tr>
            )}
            {records.map(rec => (
              <tr key={rec._id} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                {db.fields.map(f => (
                  <td key={f.key} style={{ padding: '10px 14px', fontSize: '14px', color: 'var(--text-primary)' }}>{rec.values?.[f.key] ?? '—'}</td>
                ))}
                <td style={{ padding: '8px 14px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => openEdit(rec)} style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>Edit</button>
                    <button onClick={() => handleDelete(rec._id)} style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--error)' }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={editing ? 'Edit Record' : 'New Record'}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {db.fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>{f.label}{f.required && ' *'}</label>
              {f.type === 'checkbox' ? (
                <input type="checkbox" checked={!!form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.checked }))} style={{ accentColor: 'var(--primary)' }} />
              ) : f.type === 'select' ? (
                <select value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}>
                  <option value="">Select...</option>
                  {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} required={f.required} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
