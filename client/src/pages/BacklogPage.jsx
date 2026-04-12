import React, { useState, useEffect, useRef } from 'react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  BacklogIcon, SprintIcon, TaskIcon, AddIcon, EditIcon, DeleteIcon,
  PlayIcon, CheckCircleIcon, CloseIcon, DragIcon, MoveIcon,
  PriorityIcon, DueDateIcon, ChevronDown, ChevronUp,
  FireIcon, TrophyIcon, FilterIcon, RefreshIcon, WarnIcon,
  FlagIcon, InfoIcon, FlashIcon, TimerIcon, ChecklistIcon,
  ArrowRight,
} from '../components/common/Icons';

const authHeader = () => {
  try {
    const s = JSON.parse(localStorage.getItem('auth-store') || '{}');
    return s.state?.token
      ? { Authorization: `Bearer ${s.state.token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  } catch { return { 'Content-Type': 'application/json' }; }
};

const api = async (method, path, body) => {
  const res = await fetch(`/api${path}`, {
    method, headers: authHeader(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || res.statusText); }
  return res.json().catch(() => ({}));
};

const PRIORITY_COLORS = { urgent: 'var(--error)', high: 'var(--warning)', medium: 'var(--primary)', low: 'var(--text-muted)' };
const PRIORITY_LABELS = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };
const TASK_TYPES = ['all', 'feature', 'bug', 'chore', 'improvement'];

export default function BacklogPage() {
  const [backlog, setBacklog]       = useState([]);
  const [sprints, setSprints]       = useState([]);
  const [activeSprint, setActive]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [quickAdd, setQuickAdd]     = useState('');
  const [dragId, setDragId]         = useState(null);
  const [sprintForm, setSprintForm] = useState({ name: '', goal: '', startDate: '', endDate: '' });
  const [expandedSprint, setExpanded] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [taskRes, sprintRes] = await Promise.allSettled([
        api('GET', '/tasks?sprintId=none&status[ne]=done&limit=100'),
        api('GET', '/sprints?limit=20'),
      ]);
      if (taskRes.status === 'fulfilled') setBacklog(taskRes.value.tasks || taskRes.value || []);
      if (sprintRes.status === 'fulfilled') {
        const all = sprintRes.value.sprints || sprintRes.value || [];
        setSprints(all);
        setActive(all.find(s => s.status === 'active') || null);
        if (all.length) setExpanded(all[0]._id);
      }
    } catch (e) { toast.error('Failed to load backlog'); }
    finally { setLoading(false); }
  };

  /* ── quick-add task ── */
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    try {
      const t = await api('POST', '/tasks', { title: quickAdd, status: 'todo', priority: 'medium' });
      setBacklog(prev => [t, ...prev]);
      setQuickAdd('');
      toast.success('Task added to backlog');
    } catch (e) { toast.error(e.message); }
  };

  /* ── create sprint ── */
  const handleCreateSprint = async () => {
    if (!sprintForm.name.trim()) return toast.error('Sprint name required');
    try {
      const s = await api('POST', '/sprints', sprintForm);
      setSprints(prev => [...prev, s]);
      setSprintForm({ name: '', goal: '', startDate: '', endDate: '' });
      setShowNewSprint(false);
      setExpanded(s._id);
      toast.success(`Sprint "${s.name}" created`);
    } catch (e) { toast.error(e.message); }
  };

  /* ── start / complete sprint ── */
  const updateSprintStatus = async (id, status) => {
    try {
      const s = await api('PATCH', `/sprints/${id}`, { status });
      setSprints(prev => prev.map(sp => sp._id === id ? s : sp));
      if (status === 'active') setActive(s);
      if (status === 'completed') { setActive(null); load(); }
      toast.success(status === 'active' ? 'Sprint started!' : 'Sprint completed!');
    } catch (e) { toast.error(e.message); }
  };

  /* ── drag backlog → sprint ── */
  const handleDrop = async (e, sprintId) => {
    e.preventDefault();
    if (!dragId) return;
    try {
      const updated = await api('PATCH', `/tasks/${dragId}`, { sprintId });
      setBacklog(prev => prev.filter(t => t._id !== dragId));
      setSprints(prev => prev.map(sp =>
        sp._id === sprintId
          ? { ...sp, tasks: [...(sp.tasks || []), updated] }
          : sp
      ));
      toast.success('Moved to sprint');
    } catch (e) { toast.error(e.message); }
    setDragId(null);
  };

  /* ── remove from sprint → backlog ── */
  const removeFromSprint = async (taskId, sprintId) => {
    try {
      const updated = await api('PATCH', `/tasks/${taskId}`, { sprintId: null });
      setSprints(prev => prev.map(sp =>
        sp._id === sprintId
          ? { ...sp, tasks: (sp.tasks || []).filter(t => t._id !== taskId) }
          : sp
      ));
      setBacklog(prev => [updated, ...prev]);
      toast.success('Moved to backlog');
    } catch (e) { toast.error(e.message); }
  };

  const filtered = typeFilter === 'all' ? backlog : backlog.filter(t => t.type === typeFilter);

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
      <RefreshIcon spin /> Loading backlog…
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── LEFT: Backlog ── */}
      <div style={{
        width: 400, minWidth: 340, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <BacklogIcon style={{ color: 'var(--primary)', fontSize: 18 }} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Backlog</h2>
            <span style={{
              marginLeft: 'auto', background: 'var(--surface-alt)', color: 'var(--text-muted)',
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
            }}>{filtered.length}</span>
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {TASK_TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} style={{
                padding: '3px 10px', borderRadius: 12, border: '1px solid var(--border)',
                background: typeFilter === t ? 'var(--primary)' : 'transparent',
                color: typeFilter === t ? '#fff' : 'var(--text-secondary)',
                fontSize: 11, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
              }}>{t}</button>
            ))}
          </div>
        </div>

        <FeatureGuide
          storageKey="backlog"
          title="Backlog"
          icon={<BacklogIcon />}
          description="Manage your sprint backlog. Drag items into a sprint to plan your upcoming work cycle."
          steps={[
            { icon: <AddIcon size="xs" />, title: 'Add items', body: 'Type a task in the quick-add bar at the bottom and press Enter.' },
            { icon: <SprintIcon size="xs" />, title: 'Create a sprint', body: 'Click "New Sprint" on the right panel and set a name and dates.' },
            { icon: <DragIcon size="xs" />, title: 'Drag to sprint', body: 'Grab any backlog item and drop it onto a sprint to assign it.' },
            { icon: <PlayIcon size="xs" />, title: 'Start the sprint', body: 'Click "Start Sprint" when ready. Only one sprint can be active at a time.' },
          ]}
          tips={[
            'Filter by type: Feature / Bug / Chore',
            'Drag items back from a sprint to the backlog',
            'Use story point estimates for sprint capacity planning',
          ]}
        />

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
              <BacklogIcon style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 13 }}>Backlog is empty</p>
              <p style={{ margin: '4px 0 0', fontSize: 11 }}>Add tasks below or move done items here</p>
            </div>
          )}
          {filtered.map(task => (
            <BacklogItem
              key={task._id}
              task={task}
              draggable
              onDragStart={() => setDragId(task._id)}
              onDragEnd={() => setDragId(null)}
              isDragging={dragId === task._id}
            />
          ))}
        </div>

        {/* Quick add */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
          <form onSubmit={handleQuickAdd} style={{ display: 'flex', gap: 6 }}>
            <input
              value={quickAdd}
              onChange={e => setQuickAdd(e.target.value)}
              placeholder="Quick add task to backlog…"
              style={{
                flex: 1, padding: '7px 10px',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                background: 'var(--surface-alt)', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
              }}
            />
            <button type="submit" style={{
              background: 'var(--primary)', color: '#fff', border: 'none',
              borderRadius: 'var(--radius)', padding: '7px 12px', cursor: 'pointer',
            }}>
              <AddIcon size="xs" />
            </button>
          </form>
        </div>
      </div>

      {/* ── RIGHT: Sprints ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <SprintIcon style={{ color: 'var(--primary)', fontSize: 18 }} />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Sprints</h2>
          <Button size="sm" onClick={() => setShowNewSprint(true)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AddIcon size="xs" /> New Sprint
          </Button>
        </div>

        {sprints.length === 0 && !showNewSprint && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
          }}>
            <SprintIcon style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }} />
            <p style={{ margin: '0 0 12px', fontSize: 14 }}>No sprints yet</p>
            <Button onClick={() => setShowNewSprint(true)}>
              <AddIcon size="xs" style={{ marginRight: 6 }} /> Create First Sprint
            </Button>
          </div>
        )}

        {/* New sprint form */}
        {showNewSprint && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 20, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <SprintIcon style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>New Sprint</span>
              <button onClick={() => setShowNewSprint(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <CloseIcon size="xs" />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <input placeholder="Sprint name *" value={sprintForm.name} onChange={e => setSprintForm(p => ({ ...p, name: e.target.value }))}
                style={{ gridColumn: '1/-1', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface-alt)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
              <input placeholder="Sprint goal" value={sprintForm.goal} onChange={e => setSprintForm(p => ({ ...p, goal: e.target.value }))}
                style={{ gridColumn: '1/-1', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface-alt)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
              <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: 'var(--text-muted)' }}>
                Start date
                <input type="date" value={sprintForm.startDate} onChange={e => setSprintForm(p => ({ ...p, startDate: e.target.value }))}
                  style={{ padding: '7px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface-alt)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: 'var(--text-muted)' }}>
                End date
                <input type="date" value={sprintForm.endDate} onChange={e => setSprintForm(p => ({ ...p, endDate: e.target.value }))}
                  style={{ padding: '7px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface-alt)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={() => setShowNewSprint(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreateSprint}>Create Sprint</Button>
            </div>
          </div>
        )}

        {/* Sprint cards */}
        {sprints.map(sprint => (
          <SprintCard
            key={sprint._id}
            sprint={sprint}
            expanded={expandedSprint === sprint._id}
            onToggleExpand={() => setExpanded(p => p === sprint._id ? null : sprint._id)}
            onUpdateStatus={updateSprintStatus}
            onDrop={handleDrop}
            onRemoveTask={removeFromSprint}
            dragId={dragId}
          />
        ))}
      </div>
    </div>
  );
}

/* ── BacklogItem ── */
function BacklogItem({ task, draggable, onDragStart, onDragEnd, isDragging }) {
  const TYPE_COLORS = { feature: 'var(--success)', bug: 'var(--error)', chore: 'var(--text-muted)', improvement: 'var(--info, #3B82F6)' };
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
        background: isDragging ? 'var(--primary)12' : 'var(--surface)',
        border: `1px solid ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)', marginBottom: 4, cursor: 'grab',
        opacity: isDragging ? 0.6 : 1,
        transition: 'border-color 150ms',
      }}
    >
      <DragIcon style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }} />
      {task.type && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLORS[task.type] || 'var(--text-muted)', flexShrink: 0 }} />
      )}
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.title}
      </span>
      {task.priority && task.priority !== 'medium' && (
        <span style={{ fontSize: 10, color: { urgent: 'var(--error)', high: 'var(--warning)', low: 'var(--text-muted)' }[task.priority] || 'var(--text-muted)', fontWeight: 600 }}>
          {task.priority.toUpperCase()}
        </span>
      )}
      {task.estimatedPoints && (
        <span style={{ fontSize: 10, background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', color: 'var(--text-muted)', fontWeight: 600 }}>
          {task.estimatedPoints}
        </span>
      )}
    </div>
  );
}

/* ── SprintCard ── */
function SprintCard({ sprint, expanded, onToggleExpand, onUpdateStatus, onDrop, onRemoveTask, dragId }) {
  const [over, setOver] = useState(false);
  const tasks = sprint.tasks || [];
  const done = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const STATUS_CONFIG = {
    pending:   { label: 'Planned', color: 'var(--text-muted)', bg: 'var(--surface-alt)' },
    active:    { label: 'Active',  color: 'var(--success)',    bg: 'var(--success)18' },
    completed: { label: 'Done',    color: 'var(--primary)',    bg: 'var(--primary)12' },
  };
  const sc = STATUS_CONFIG[sprint.status] || STATUS_CONFIG.pending;

  return (
    <div
      style={{
        background: over && dragId ? 'var(--primary)08' : 'var(--surface)',
        border: `1px solid ${over && dragId ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)', marginBottom: 12, overflow: 'hidden',
        transition: 'border-color 150ms',
      }}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { setOver(false); onDrop(e, sprint._id); }}
    >
      {/* Sprint header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <SprintIcon style={{ color: sprint.status === 'active' ? 'var(--success)' : 'var(--text-muted)', fontSize: 14 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{sprint.name}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: sc.color, background: sc.bg, padding: '2px 7px', borderRadius: 10 }}>
              {sc.label}
            </span>
          </div>
          {sprint.goal && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sprint.goal}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {sprint.status === 'pending' && (
            <Button size="sm" onClick={() => onUpdateStatus(sprint._id, 'active')}
              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <PlayIcon size="xs" /> Start
            </Button>
          )}
          {sprint.status === 'active' && (
            <Button size="sm" variant="secondary" onClick={() => onUpdateStatus(sprint._id, 'completed')}
              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCircleIcon size="xs" /> Complete
            </Button>
          )}
          <button onClick={onToggleExpand} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 6px' }}>
            {expanded ? <ChevronUp size="xs" /> : <ChevronDown size="xs" />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>{done}/{tasks.length} tasks</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: 4, background: 'var(--surface-alt)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--success)', borderRadius: 2, transition: 'width 300ms' }} />
          </div>
        </div>
      )}

      {/* Sprint dates */}
      {(sprint.startDate || sprint.endDate) && !expanded && (
        <div style={{ padding: '0 16px 10px', fontSize: 11, color: 'var(--text-muted)' }}>
          {sprint.startDate && format(new Date(sprint.startDate), 'MMM d')}
          {sprint.startDate && sprint.endDate && ' → '}
          {sprint.endDate && format(new Date(sprint.endDate), 'MMM d, yyyy')}
        </div>
      )}

      {/* Sprint tasks */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {tasks.length === 0 ? (
            <div style={{
              padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12,
              border: '2px dashed var(--border)', margin: 12, borderRadius: 'var(--radius)',
              background: over && dragId ? 'var(--primary)08' : 'transparent',
            }}>
              <ArrowRight style={{ opacity: 0.4, marginRight: 6 }} size="xs" />
              Drag backlog items here
            </div>
          ) : (
            <div style={{ padding: '6px 12px' }}>
              {tasks.map(task => (
                <div key={task._id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px',
                  borderRadius: 'var(--radius)', marginBottom: 2,
                  background: task.status === 'done' ? 'var(--success)08' : 'transparent',
                }}>
                  <span style={{ color: task.status === 'done' ? 'var(--success)' : 'var(--border)', fontSize: 12 }}>
                    {task.status === 'done' ? <CheckCircleIcon size="xs" /> : <TaskIcon size="xs" />}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 12, color: 'var(--text-primary)',
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {task.title}
                  </span>
                  {task.estimatedPoints && (
                    <span style={{ fontSize: 10, background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {task.estimatedPoints}
                    </span>
                  )}
                  <Tooltip content="Move back to backlog">
                    <button onClick={() => onRemoveTask(task._id, sprint._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', opacity: 0.6 }}>
                      <CloseIcon size="xs" />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
