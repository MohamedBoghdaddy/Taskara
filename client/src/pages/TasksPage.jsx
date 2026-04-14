import React, { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../api/tasks';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  TaskIcon, ListIcon, BoardIcon, AddIcon, DeleteIcon, FilterIcon,
  CheckCircleIcon, PriorityIcon, DueDateIcon, KanbanIcon, EditIcon,
  LoadingIcon, BugIcon, WrenchIcon, RocketIcon, FlashIcon,
  CheckboxIcon, PlayIcon, InboxIcon, WarnIcon, SubtaskIcon, LabelIcon,
  SortUpIcon, SortDownIcon, MoreVertIcon, EyeOffIcon, EyeIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUSES = ['inbox', 'todo', 'in_progress', 'blocked', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TASK_TYPES = ['feature', 'bug', 'chore', 'improvement'];

const STATUS_ICONS = {
  inbox:       { Icon: InboxIcon,       color: 'var(--text-muted)' },
  todo:        { Icon: CheckboxIcon,    color: 'var(--primary)' },
  in_progress: { Icon: PlayIcon,        color: '#f59e0b' },
  blocked:     { Icon: WarnIcon,        color: 'var(--error)' },
  done:        { Icon: CheckCircleIcon, color: 'var(--success)' },
};

const TYPE_DEFS = {
  feature:     { Icon: RocketIcon, color: 'var(--success)' },
  bug:         { Icon: BugIcon,    color: 'var(--error)' },
  chore:       { Icon: WrenchIcon, color: 'var(--text-muted)' },
  improvement: { Icon: FlashIcon,  color: 'var(--primary)' },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc' — sort by priority/due date
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', type: '' });
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => { loadTasks(); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTasks = async () => {
    setLoading(true);
    try { const d = await getTasks(filters); setTasks(d.tasks || []); }
    catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const task = await createTask({ ...form, dueDate: form.dueDate || undefined, type: form.type || undefined });
      setTasks(prev => [task, ...prev]);
      setShowCreate(false);
      setForm({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', type: '' });
      toast.success('Task created');
    } catch { toast.error('Failed to create task'); }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const updated = await updateTask(task._id, { status: newStatus });
      setTasks(ts => ts.map(t => t._id === task._id ? updated : t));
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete task?')) return;
    try { await deleteTask(id); setTasks(ts => ts.filter(t => t._id !== id)); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const grouped = view === 'board'
    ? STATUSES.reduce((acc, s) => ({ ...acc, [s]: tasks.filter(t => t.status === s) }), {})
    : null;

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Tasks</h1>
        <Tooltip content="Create a new task" placement="left">
          <Button onClick={() => setShowCreate(true)}>
            <AddIcon size="sm" style={{ marginRight: '6px' }} /> New Task
          </Button>
        </Tooltip>
      </div>

      <FeatureGuide
        storageKey="tasks-page"
        title="Tasks"
        icon={<TaskIcon />}
        description="Manage all your tasks in one place. Switch between a flat list and a Kanban board, filter by status or priority, and click any task to edit details."
        steps={[
          {
            icon: <AddIcon />,
            title: 'Create a task',
            body: 'Click "New Task" to open the creation form. Set a title, priority, and optional due date.',
          },
          {
            icon: <KanbanIcon />,
            title: 'Board view',
            body: 'Switch to Board to see tasks grouped by status columns: Inbox, Todo, In Progress, Blocked, Done.',
          },
          {
            icon: <FilterIcon />,
            title: 'Filter tasks',
            body: 'Use the Status and Priority dropdowns to narrow the task list to exactly what you need.',
          },
          {
            icon: <EditIcon />,
            title: 'Edit a task',
            body: 'Click any task row to open the detail modal where you can update title, status, priority, and due date.',
          },
          {
            icon: <CheckCircleIcon />,
            title: 'Complete tasks',
            body: 'Check the checkbox on any task to toggle it between Todo and Done instantly.',
          },
        ]}
        tips={[
          'Use "urgent" priority for tasks that block others',
          'Board view is great for a daily standup overview',
          'Overdue tasks show a red OVERDUE badge in list view',
          'Filter by "blocked" to quickly identify stuck work',
        ]}
        accentColor="var(--primary)"
      />

      {/* View switcher + filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <Tooltip content="List view" placement="bottom">
            <button
              onClick={() => setView('list')}
              style={{ padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', background: view === 'list' ? 'var(--primary)' : 'var(--surface)', color: view === 'list' ? '#fff' : 'var(--text-secondary)' }}
            >
              <ListIcon size="sm" /> List
            </button>
          </Tooltip>
          <Tooltip content="Board view" placement="bottom">
            <button
              onClick={() => setView('board')}
              style={{ padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', background: view === 'board' ? 'var(--primary)' : 'var(--surface)', color: view === 'board' ? '#fff' : 'var(--text-secondary)' }}
            >
              <BoardIcon size="sm" /> Board
            </button>
          </Tooltip>
        </div>
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select
          value={filters.priority}
          onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
          style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
        >
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <Tooltip content={sortDir === 'desc' ? 'Newest first (click to reverse)' : 'Oldest first (click to reverse)'} placement="bottom">
          <button
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
          >
            {sortDir === 'desc' ? <SortDownIcon size="sm" /> : <SortUpIcon size="sm" />}
            Sort
          </button>
        </Tooltip>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <LoadingIcon /> Loading tasks…
        </div>
      ) : (
        <>
          {view === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {tasks.length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                  <TaskIcon style={{ fontSize: '36px', opacity: 0.35, display: 'block', margin: '0 auto 12px' }} />
                  No tasks yet. Create your first one!
                </div>
              )}
              {tasks.map(task => (
                <TaskListRow
                  key={task._id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onClick={setSelectedTask}
                />
              ))}
            </div>
          )}
          {view === 'board' && (
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px' }}>
              {STATUSES.map(status => (
                <div key={status} style={{ minWidth: '220px', flex: '0 0 220px' }}>
                  <div style={{ padding: '8px 12px', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--surface-alt)', borderRadius: 'var(--radius)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {STATUS_ICONS[status] && React.createElement(STATUS_ICONS[status].Icon, { size: 'xs', color: STATUS_ICONS[status].color })}
                      {status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '11px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1px 7px' }}>{grouped[status]?.length || 0}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(grouped[status] || []).map(task => (
                      <div
                        key={task._id}
                        style={{ padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '13px' }}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>{task.title}</div>
                        <Badge type={task.priority} label={task.priority} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Task">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" required />
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
              rows={3}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          {/* Type picker */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
              <LabelIcon size="xs" /> Type
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {TASK_TYPES.map(t => {
                const def = TYPE_DEFS[t];
                const active = form.type === t;
                return (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: active ? '' : t }))}
                    style={{ padding: '5px 10px', border: `1px solid ${active ? def.color : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '12px', fontWeight: active ? '600' : '400', background: active ? `${def.color}18` : 'var(--surface)', color: active ? def.color : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <def.Icon size="xs" color={active ? def.color : 'var(--text-muted)'} />
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <PriorityIcon size="xs" /> Priority
              </label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Input label="Due date" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)} type="button">Cancel</Button>
            <Button type="submit">Create Task</Button>
          </div>
        </form>
      </Modal>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updated => { setTasks(ts => ts.map(t => t._id === updated._id ? updated : t)); setSelectedTask(updated); }}
        />
      )}
    </div>
  );
}

function TaskListRow({ task, onStatusChange, onDelete, onClick }) {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const typeDef = task.type && TYPE_DEFS[task.type];
  const subtaskCount = task.subtasks?.length || task.subtaskCount || 0;
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer' }}
      onClick={() => onClick(task)}
    >
      <input
        type="checkbox"
        checked={task.status === 'done'}
        onClick={e => e.stopPropagation()}
        onChange={() => onStatusChange(task, task.status === 'done' ? 'todo' : 'done')}
        style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }}
      />
      {typeDef && (
        <Tooltip content={task.type} placement="top">
          <span style={{ color: typeDef.color, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <typeDef.Icon size="xs" />
          </span>
        </Tooltip>
      )}
      <span style={{ flex: 1, fontSize: '14px', textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
        {task.title}
      </span>
      {subtaskCount > 0 && (
        <Tooltip content={`${subtaskCount} subtask${subtaskCount > 1 ? 's' : ''}`} placement="top">
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <SubtaskIcon size="xs" /> {subtaskCount}
          </span>
        </Tooltip>
      )}
      {overdue && <span style={{ fontSize: '11px', color: 'var(--error)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}><WarnIcon size="xs" /> OVERDUE</span>}
      {task.dueDate && !overdue && <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}><DueDateIcon size="xs" /> {format(new Date(task.dueDate), 'MMM d')}</span>}
      <Badge type={task.priority} label={task.priority} />
      <Badge type={task.status} label={task.status.replace('_', ' ')} />
      <Tooltip content="More options" placement="left">
        <button
          onClick={e => e.stopPropagation()}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', opacity: 0.5 }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
        >
          <MoreVertIcon size="sm" />
        </button>
      </Tooltip>
      <Tooltip content="Delete task" placement="left">
        <button
          onClick={e => { e.stopPropagation(); onDelete(task._id); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center' }}
        >
          <DeleteIcon size="sm" />
        </button>
      </Tooltip>
    </div>
  );
}

function TaskDetailModal({ task, onClose, onUpdate }) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
  });
  const [showDesc, setShowDesc] = useState(true);

  const handleSave = async () => {
    try {
      const updated = await updateTask(task._id, { ...form, dueDate: form.dueDate || undefined });
      onUpdate(updated);
      onClose();
      toast.success('Saved');
    } catch { toast.error('Failed to save'); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Task Details" width="560px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <div>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setShowDesc(v => !v)}>
            Description
            {showDesc ? <EyeIcon size="xs" color="var(--text-muted)" /> : <EyeOffIcon size="xs" color="var(--text-muted)" />}
          </label>
          {showDesc && (
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Priority</label>
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <Input label="Due date" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
