import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { search } from '../api/index';
import { format } from 'date-fns';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      search(q).then(d => setResults(d.results || [])).catch(() => {}).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const filtered = typeFilter ? results.filter(r => r.type === typeFilter) : results;
  const types = [...new Set(results.map(r => r.type))];

  const handleClick = (r) => {
    if (r.type === 'note') navigate(`/notes/${r.item._id}`);
    else if (r.type === 'task') navigate(`/tasks`);
    else if (r.type === 'project') navigate(`/projects/${r.item._id}`);
  };

  const icons = { note: '📝', task: '✓', project: '📁' };

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px' }}>Search</h1>

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
        <input value={q} onChange={e => setQ(e.target.value)} autoFocus
          placeholder="Search notes, tasks, projects..."
          style={{ width: '100%', padding: '12px 14px 12px 40px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none' }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
        />
      </div>

      {types.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          <button onClick={() => setTypeFilter('')} style={{ padding: '4px 12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px', background: !typeFilter ? 'var(--primary)' : 'var(--surface-alt)', color: !typeFilter ? '#fff' : 'var(--text-secondary)' }}>All</button>
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '4px 12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px', background: typeFilter === t ? 'var(--primary)' : 'var(--surface-alt)', color: typeFilter === t ? '#fff' : 'var(--text-secondary)' }}>{icons[t]} {t}</button>
          ))}
        </div>
      )}

      {loading && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Searching...</div>}
      {!loading && q && filtered.length === 0 && <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No results for "{q}"</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filtered.map((r, i) => (
          <div key={i} onClick={() => handleClick(r)} style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <span style={{ fontSize: '18px' }}>{icons[r.type] || '•'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '500', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.item.title || r.item.name}</div>
              {(r.item.contentText || r.item.description) && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.item.contentText || r.item.description}</div>}
            </div>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'var(--surface-alt)', color: 'var(--text-muted)', flexShrink: 0 }}>{r.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
