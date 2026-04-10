import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDatabases, createDatabase } from '../api/index';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';

export default function DatabasesPage() {
  const [dbs, setDbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon: '' });

  useEffect(() => {
    getDatabases().then(setDbs).catch(() => toast.error('Failed to load databases')).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const db = await createDatabase(form);
      setDbs(prev => [db, ...prev]);
      setShowCreate(false); setForm({ name: '', description: '', icon: '' });
      toast.success('Database created');
    } catch { toast.error('Failed to create'); }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Databases</h1>
        <Button onClick={() => setShowCreate(true)}>+ New Database</Button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }}>
          {dbs.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              No databases yet. <button onClick={() => setShowCreate(true)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Create one →</button>
            </div>
          )}
          {dbs.map(db => (
            <Link key={db._id} to={`/databases/${db._id}`} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>{db.icon || '🗄️'}</div>
                <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>{db.name}</div>
                {db.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{db.description}</p>}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{db.fields?.length || 0} fields</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Database">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Input label="Icon (emoji)" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🗄️" />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
