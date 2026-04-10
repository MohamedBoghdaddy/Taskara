import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject, updateProject } from '../api/projects';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import toast from 'react-hot-toast';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    getProject(id).then(setData).catch(() => toast.error('Failed to load project')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!data) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--error)' }}>Project not found</div>;

  const { project, tasks = [], notes = [], taskStats, focusStats } = data;
  const progress = taskStats?.total ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/projects" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>← Projects</Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>{project.icon || '📁'} {project.name}</h1>
          {project.description && <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{project.description}</p>}
        </div>
        <Badge type={project.status} label={project.status.replace('_', ' ')} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total tasks', value: taskStats?.total || 0 },
          { label: 'Completed', value: taskStats?.done || 0, color: 'var(--success)' },
          { label: 'In progress', value: taskStats?.inProgress || 0, color: 'var(--primary)' },
          { label: 'Focus mins', value: focusStats?.totalMinutes || 0, color: 'var(--primary)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <div style={{ fontSize: '26px', fontWeight: '700', color: s.color || 'var(--text-primary)' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {taskStats?.total > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Progress</span>
            <span style={{ fontWeight: '600' }}>{progress}%</span>
          </div>
          <div style={{ height: '8px', background: 'var(--surface-alt)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--primary)', borderRadius: '4px', transition: 'width 0.4s' }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        {['overview', 'tasks', 'notes'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: tab === t ? '600' : '400', color: tab === t ? 'var(--primary)' : 'var(--text-secondary)', borderBottom: `2px solid ${tab === t ? 'var(--primary)' : 'transparent'}`, marginBottom: '-1px' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {tasks.length === 0 ? <div style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>No tasks in this project</div> :
            tasks.map(t => (
              <div key={t._id} style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                <Badge type={t.status} label={t.status.replace('_',' ')} />
                <span style={{ flex: 1 }}>{t.title}</span>
                {t.dueDate && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(t.dueDate).toLocaleDateString()}</span>}
                <Badge type={t.priority} label={t.priority} />
              </div>
            ))
          }
        </div>
      )}

      {tab === 'notes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {notes.length === 0 ? <div style={{ color: 'var(--text-muted)', padding: '24px' }}>No notes in this project</div> :
            notes.map(n => (
              <Link key={n._id} to={`/notes/${n._id}`} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px' }}>{n.title || 'Untitled'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(n.updatedAt).toLocaleDateString()}</div>
                </div>
              </Link>
            ))
          }
        </div>
      )}

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontWeight: '600', marginBottom: '12px' }}>Recent Tasks</div>
            {tasks.slice(0, 5).map(t => (
              <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: t.status === 'done' ? 'var(--success)' : 'var(--text-muted)' }}>{t.status === 'done' ? '✓' : '○'}</span>
                <span>{t.title}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontWeight: '600', marginBottom: '12px' }}>Recent Notes</div>
            {notes.slice(0, 5).map(n => (
              <Link key={n._id} to={`/notes/${n._id}`} style={{ display: 'block', padding: '6px 0', fontSize: '13px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>📝 {n.title || 'Untitled'}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
