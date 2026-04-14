import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { search } from '../api/index';
import FeatureGuide from '../components/common/FeatureGuide';
import {
  SearchIcon, NoteIcon, TaskIcon, ProjectIcon, FilterIcon, SpinnerIcon,
} from '../components/common/Icons';

const TYPE_ICONS = {
  note:    <NoteIcon />,
  task:    <TaskIcon />,
  project: <ProjectIcon />,
  page:    <SearchIcon />,
};

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') || '';
  const [q, setQ] = useState(urlQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setQ(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed) setParams({ q: trimmed }, { replace: true });
    else setParams({}, { replace: true });
  }, [q, setParams]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    const t = setTimeout(() => {
      search(trimmed)
        .then((d) => {
          if (!cancelled) setResults(Array.isArray(d.results) ? d.results : []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const filtered = typeFilter ? results.filter(r => r.type === typeFilter) : results;
  const types = [...new Set(results.map(r => r.type))];

  const handleClick = (r) => {
    if (r.type === 'note') navigate(`/notes/${r.item._id}`);
    else if (r.type === 'task') navigate(`/tasks?highlight=${r.item._id}`);
    else if (r.type === 'project') navigate(`/projects/${r.item._id}`);
    else if (r.type === 'page' && r.item.path) navigate(r.item.path);
  };

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <SearchIcon color="var(--primary)" /> Search
      </h1>

      <FeatureGuide
        storageKey="search-guide"
        title="Search"
        icon={<SearchIcon />}
        description="Full-text search across all your notes, tasks, and projects. Results appear as you type."
        steps={[
          {
            icon: <SearchIcon />,
            title: 'Full-text search',
            body: 'Type any keyword — Taskara searches titles and content across notes, tasks, and projects instantly.',
          },
          {
            icon: <FilterIcon />,
            title: 'Filter by type',
            body: 'Click the type pills (Notes, Tasks, Projects) to narrow results to just that content type.',
          },
          {
            icon: <NoteIcon />,
            title: 'Recent searches',
            body: 'Click any result to jump directly to that item. Use the browser back button to return.',
          },
        ]}
        tips={[
          'Search is case-insensitive and matches partial words',
          'Use the URL ?q= parameter to share a search link',
          'Results are ranked by relevance, not date',
        ]}
        accentColor="var(--primary)"
      />

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <SearchIcon size="sm" />
        </span>
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
            <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '4px 12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px', background: typeFilter === t ? 'var(--primary)' : 'var(--surface-alt)', color: typeFilter === t ? '#fff' : 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>{TYPE_ICONS[t]}</span> {t}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <SpinnerIcon /> Searching...
        </div>
      )}
      {!loading && q.trim().length === 1 && (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Type at least 2 characters to search.
        </div>
      )}

      {!loading && q.trim().length >= 2 && filtered.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No results for "{q}"
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filtered.map((r, i) => (
          <div key={i} onClick={() => handleClick(r)} style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <span style={{ fontSize: '16px', color: 'var(--primary)', flexShrink: 0 }}>{TYPE_ICONS[r.type] || <TaskIcon />}</span>
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
