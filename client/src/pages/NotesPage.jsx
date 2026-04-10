import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getNotes, createNote, deleteNote } from '../api/notes';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getNotes({ search, ...filter })
      .then(d => setNotes(d.notes || []))
      .catch(() => toast.error('Failed to load notes'))
      .finally(() => setLoading(false));
  }, [search, filter]);

  const handleCreate = async () => {
    try {
      const note = await createNote({ title: 'Untitled Note', content: '' });
      navigate(`/notes/${note._id}`);
    } catch { toast.error('Failed to create note'); }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm('Delete this note?')) return;
    try { await deleteNote(id); setNotes(ns => ns.filter(n => n._id !== id)); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Notes</h1>
        <Button onClick={handleCreate}>+ New Note</Button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..."
          style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { label: 'All', key: {} },
          { label: '📌 Pinned', key: { isPinned: true } },
          { label: '⭐ Favorites', key: { isFavorite: true } },
        ].map(f => (
          <button key={f.label} onClick={() => setFilter(f.key)} style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '13px', background: JSON.stringify(filter) === JSON.stringify(f.key) ? 'var(--primary)' : 'var(--surface)', color: JSON.stringify(filter) === JSON.stringify(f.key) ? '#fff' : 'var(--text-secondary)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {notes.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              No notes yet. <button onClick={handleCreate} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Create your first note →</button>
            </div>
          )}
          {notes.map(note => (
            <Link key={note._id} to={`/notes/${note._id}`} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', height: '140px', display: 'flex', flexDirection: 'column', position: 'relative' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                {note.isPinned && <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '12px' }}>📌</span>}
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '20px' }}>{note.title || 'Untitled'}</div>
                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {note.contentText || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Empty note</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{format(new Date(note.updatedAt), 'MMM d')}</span>
                  <button onClick={e => handleDelete(note._id, e)} style={{ fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px' }}>✕</button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      }
    </div>
  );
}
