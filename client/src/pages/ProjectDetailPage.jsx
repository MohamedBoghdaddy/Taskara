import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject } from '../api/projects';
import Badge from '../components/common/Badge';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  ProjectOpenIcon,
  TaskIcon,
  NoteIcon,
  CheckCircleIcon,
  TimerIcon,
  ArrowLeft,
  CheckIcon,
  LayersIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    getProject(id)
      .then(setData)
      .catch(() => toast.error('Failed to load project'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!data) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--error)' }}>Project not found</div>;

  const { project, tasks = [], notes = [], taskStats, focusStats } = data;
  const progress = taskStats?.total ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

  const TAB_ICONS = {
    overview: <LayersIcon />,
    tasks: <TaskIcon />,
    notes: <NoteIcon />,
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <FeatureGuide
        storageKey="project-detail-guide"
        title="Project Detail"
        icon={<ProjectOpenIcon />}
        description="Explore a project's tasks, notes, and progress all in one place. Switch between tabs to manage work or review linked notes."
        steps={[
          {
            icon: <LayersIcon />,
            title: 'Overview tab',
            body: 'See recent tasks and notes summarised side by side for a quick health check.',
          },
          {
            icon: <TaskIcon />,
            title: 'Tasks tab',
            body: 'Browse all tasks in this project, with status badges and due dates.',
          },
          {
            icon: <NoteIcon />,
            title: 'Notes tab',
            body: 'View all notes linked to this project. Click a note to open and edit it.',
          },
          {
            icon: <CheckCircleIcon />,
            title: 'Progress bar',
            body: 'The progress bar auto-updates based on the ratio of completed to total tasks.',
          },
        ]}
        tips={[
          'Link tasks to this project from the Tasks page using the project field',
          'Notes linked here appear automatically — link them via the note editor',
          'Focus minutes shown here come from Pomodoro sessions tagged to this project',
        ]}
        accentColor="var(--primary)"
      />

      <div style={{ marginBottom: '24px' }}>
        <Link to="/projects" style={{ color: 'var(--text-muted)', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size="xs" /> Projects
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ProjectOpenIcon /> {project.name}
          </h1>
          {project.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{project.description}</p>
          )}
        </div>
        <Badge type={project.status} label={project.status.replace('_', ' ')} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total tasks', value: taskStats?.total || 0, icon: <TaskIcon /> },
          { label: 'Completed', value: taskStats?.done || 0, color: 'var(--success)', icon: <CheckCircleIcon /> },
          { label: 'In progress', value: taskStats?.inProgress || 0, color: 'var(--primary)', icon: <LayersIcon /> },
          { label: 'Focus mins', value: focusStats?.totalMinutes || 0, color: 'var(--primary)', icon: <TimerIcon /> },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', color: s.color || 'var(--text-muted)', marginBottom: '4px', display: 'flex', justifyContent: 'center' }}>
              {s.icon}
            </div>
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
          <Tooltip key={t} content={`Switch to ${t} view`} placement="top">
            <button
              onClick={() => setTab(t)}
              style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: tab === t ? '600' : '400', color: tab === t ? 'var(--primary)' : 'var(--text-secondary)', borderBottom: `2px solid ${tab === t ? 'var(--primary)' : 'transparent'}`, marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {TAB_ICONS[t]}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          </Tooltip>
        ))}
      </div>

      {tab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {tasks.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>No tasks in this project</div>
          ) : (
            tasks.map(t => (
              <div key={t._id} style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                <Badge type={t.status} label={t.status.replace('_', ' ')} />
                <span style={{ flex: 1 }}>{t.title}</span>
                {t.dueDate && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(t.dueDate).toLocaleDateString()}</span>}
                <Badge type={t.priority} label={t.priority} />
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {notes.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '24px' }}>No notes in this project</div>
          ) : (
            notes.map(n => (
              <Link key={n._id} to={`/notes/${n._id}`} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <NoteIcon /> {n.title || 'Untitled'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(n.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TaskIcon /> Recent Tasks
            </div>
            {tasks.slice(0, 5).map(t => (
              <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: t.status === 'done' ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  {t.status === 'done' ? <CheckIcon size="xs" /> : <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1.5px solid currentColor', display: 'inline-block' }} />}
                </span>
                <span>{t.title}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <NoteIcon /> Recent Notes
            </div>
            {notes.slice(0, 5).map(n => (
              <Link key={n._id} to={`/notes/${n._id}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0', fontSize: '13px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
                <NoteIcon size="xs" /> {n.title || 'Untitled'}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
