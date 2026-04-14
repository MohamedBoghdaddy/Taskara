import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, createProject } from '../api/projects';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  ProjectIcon,
  AddIcon,
  CheckCircleIcon,
  WarnIcon,
  ArchiveIcon,
  DueDateIcon,
  NoteIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  active: 'var(--success)',
  on_hold: 'var(--warning)',
  completed: 'var(--primary)',
  archived: 'var(--text-muted)',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', status: 'active', dueDate: '' });

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const p = await createProject({ ...form, dueDate: form.dueDate || undefined });
      setProjects(prev => [p, ...prev]);
      setShowCreate(false);
      setForm({ name: '', description: '', status: 'active', dueDate: '' });
      toast.success('Project created');
    } catch {
      toast.error('Failed to create project');
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <FeatureGuide
        storageKey="projects-guide"
        title="Projects"
        icon={<ProjectIcon />}
        description="Projects let you organise related tasks and notes under a single goal. Each project tracks progress, status, and due dates at a glance."
        steps={[
          {
            icon: <AddIcon />,
            title: 'Create a project',
            body: 'Click "New Project", give it a name, optional description, and due date.',
          },
          {
            icon: <ProjectIcon />,
            title: 'Open a project',
            body: 'Click any project card to view its tasks, notes, and progress details.',
          },
          {
            icon: <CheckCircleIcon />,
            title: 'Track status',
            body: 'Each card shows a coloured dot: green = active, yellow = on hold, blue = completed.',
          },
          {
            icon: <DueDateIcon />,
            title: 'Set a due date',
            body: 'Add a due date when creating or editing a project to keep deadlines visible.',
          },
        ]}
        tips={[
          'Use "on hold" to pause projects without archiving them',
          'Click a project card to manage tasks and notes inside it',
          'Completed projects are still searchable — archive only when truly done',
        ]}
        accentColor="var(--primary)"
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ProjectIcon /> Projects
        </h1>
        <Tooltip content="Create a new project" placement="left">
          <Button onClick={() => setShowCreate(true)}>
            <AddIcon /> New Project
          </Button>
        </Tooltip>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {projects.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              No projects yet.{' '}
              <button
                onClick={() => setShowCreate(true)}
                style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
              >
                Create your first
              </button>
            </div>
          )}
          {projects.map(p => (
            <Link key={p._id} to={`/projects/${p._id}`} style={{ textDecoration: 'none' }}>
              <div
                style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{ color: 'var(--primary)', fontSize: '18px' }}>
                    <ProjectIcon />
                  </span>
                  <Tooltip content={`Status: ${p.status.replace('_', ' ')}`} placement="top">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[p.status] || 'var(--text-muted)', display: 'inline-block', marginTop: '4px' }} />
                  </Tooltip>
                </div>
                <h3 style={{ fontWeight: '600', fontSize: '15px', marginBottom: '6px' }}>{p.name}</h3>
                {p.description && (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '10px' }}>
                    {p.description}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Badge label={p.status.replace('_', ' ')} variant={p.status === 'active' ? 'success' : p.status === 'completed' ? 'primary' : 'default'} style={{ fontSize: '10px', textTransform: 'capitalize' }} />
                    {p.status === 'on_hold' && <WarnIcon size="xs" color="#f59e0b" />}
                    {p.status === 'archived' && <ArchiveIcon size="xs" color="var(--text-muted)" />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {p.noteCount > 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <NoteIcon size="xs" /> {p.noteCount}
                      </span>
                    )}
                    {p.dueDate && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DueDateIcon size="xs" /> {new Date(p.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Project name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="My project"
            required
          />
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          <Input
            label="Due date"
            type="date"
            value={form.dueDate}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <AddIcon /> Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
