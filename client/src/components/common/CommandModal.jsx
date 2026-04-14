import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { search } from '../../api/index';
import { SearchIcon } from './Icons';
const SearchIconInline = () => <SearchIcon size="sm" />;

export default function CommandModal() {
  const { commandOpen, closeCommand } = useUIStore();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    if (commandOpen) { setQ(''); setResults([]); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [commandOpen]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setResults([]); setLoading(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { const d = await search(trimmed); setResults(Array.isArray(d.results) ? d.results : []); } catch { setResults([]); }
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  if (!commandOpen) return null;

  const handleSelect = (r) => {
    if (r.type === 'note') navigate(`/notes/${r.item._id}`);
    else if (r.type === 'task') navigate(`/tasks?highlight=${r.item._id}`);
    else if (r.type === 'project') navigate(`/projects/${r.item._id}`);
    else if (r.type === 'page' && r.item.path) navigate(r.item.path);
    closeCommand();
  };

  return (
    <div onClick={closeCommand} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '560px', background: 'var(--surface)', borderRadius: '12px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', gap: '8px' }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}><SearchIconInline /></span>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search notes, tasks, projects..."
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '16px', color: 'var(--text-primary)' }}
            onKeyDown={e => e.key === 'Escape' && closeCommand()}
          />
          {loading && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>...</span>}
        </div>
        <div style={{ maxHeight: '360px', overflow: 'auto' }}>
          {q.trim().length === 1 && !loading && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Type at least 2 characters to search</div>
          )}
          {results.length === 0 && q.trim().length >= 2 && !loading && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No results for "{q}"</div>
          )}
          {results.map((r, i) => (
            <button key={i} onClick={() => handleSelect(r)} style={{
              width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-primary)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface-alt)', color: 'var(--text-muted)' }}>{r.type}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.item.title || r.item.name}</div>
                {(r.item.description || r.item.contentText) && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.item.description || r.item.contentText}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
