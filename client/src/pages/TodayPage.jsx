import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTodayTasks, updateTask, createTask } from '../api/tasks';
import { generateDailyNote } from '../api/notes';
import { getDashboardStats } from '../api/index';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Input from '../components/common/Input';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  TodayIcon, CheckIcon, TimerIcon, InboxIcon, NoteIcon,
  FocusIcon, WarnIcon, AddIcon, CheckCircleIcon, TaskIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function TodayPage() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [dailyNote, setDailyNote] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    Promise.all([
      getTodayTasks().then(setTasks),
      getDashboardStats().then(setStats),
      generateDailyNote(today).then(setDailyNote),
    ]).catch(console.error).finally(() => setLoading(false));
  }, [today]);

  const toggleTask = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      const updated = await updateTask(task._id, { status: newStatus });
      setTasks(ts => ts.map(t => t._id === task._id ? updated : t));
    } catch { toast.error('Failed to update task'); }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const task = await createTask({ title: newTaskTitle, status: 'todo', priority: 'medium' });
      setTasks(ts => [task, ...ts]);
      setNewTaskTitle('');
    } catch { toast.error('Failed to create task'); }
  };

  const doneTasks = tasks.filter(t => t.status === 'done');
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done');

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Today</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      <FeatureGuide
        storageKey="today-page"
        title="Today"
        icon={<TodayIcon />}
        description="Your daily command center — see today's tasks, focus stats, and daily note at a glance."
        steps={[
          {
            icon: <AddIcon />,
            title: 'Add a task',
            body: 'Type in the input at the top of the task list and press Enter or click Add.',
          },
          {
            icon: <CheckCircleIcon />,
            title: 'Complete tasks',
            body: 'Click the checkbox next to any task to mark it done. Click again to reopen it.',
          },
          {
            icon: <FocusIcon />,
            title: 'Start a focus session',
            body: 'Use Quick Actions to launch the Pomodoro timer and track focused work time.',
          },
          {
            icon: <NoteIcon />,
            title: 'Write your daily note',
            body: 'Open today\'s daily note from the sidebar to journal plans, reflections, or thoughts.',
          },
        ]}
        tips={[
          'Overdue tasks are highlighted in red — tackle them first',
          'Focus minutes accumulate across all Pomodoro sessions today',
          'Use the Inbox to capture ideas without losing flow',
        ]}
        accentColor="var(--primary)"
      />

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Done today', value: doneTasks.length, color: 'var(--success)' },
            { label: 'Remaining', value: pendingTasks.length, color: 'var(--primary)' },
            { label: 'Overdue', value: overdue.length, color: overdue.length ? 'var(--error)' : 'var(--text-muted)' },
            { label: 'Focus mins', value: stats.focusStats?.totalMinutes || 0, color: 'var(--primary)' },
          ].map(s => (
            <div key={s.label} style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px' }}>
        {/* Tasks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Tasks</h2>
            <Link to="/tasks"><span style={{ fontSize: '13px', color: 'var(--primary)' }}>View all →</span></Link>
          </div>

          <form onSubmit={addTask} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              placeholder="Add a task..."
              style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            />
            <Tooltip content="Add task" placement="top">
              <Button type="submit" size="sm"><AddIcon size="sm" /></Button>
            </Tooltip>
          </form>

          {overdue.length > 0 && (
            <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <WarnIcon size="sm" style={{ color: 'var(--error)' }} />
              <span style={{ fontSize: '13px', color: 'var(--error)', fontWeight: '500' }}>{overdue.length} overdue task{overdue.length > 1 ? 's' : ''}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {pendingTasks.map(task => (
              <TaskRow key={task._id} task={task} onToggle={toggleTask} />
            ))}
            {doneTasks.length > 0 && (
              <>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '8px 0 4px', fontWeight: '500' }}>COMPLETED ({doneTasks.length})</div>
                {doneTasks.map(task => <TaskRow key={task._id} task={task} onToggle={toggleTask} />)}
              </>
            )}
            {tasks.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                No tasks for today. Add one above!
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {dailyNote && (
            <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>Daily Note</span>
                <Link to={`/daily/${today}`}><span style={{ fontSize: '12px', color: 'var(--primary)' }}>Open →</span></Link>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{dailyNote.title}</p>
            </div>
          )}
          <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '10px' }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Link to="/pomodoro">
                <Button variant="secondary" size="sm" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TimerIcon size="sm" /> Start Focus Session
                </Button>
              </Link>
              <Link to="/inbox">
                <Button variant="secondary" size="sm" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <InboxIcon size="sm" /> Capture to Inbox
                </Button>
              </Link>
              <Link to={`/daily/${today}`}>
                <Button variant="secondary" size="sm" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <NoteIcon size="sm" /> Open Daily Note
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle }) {
  const done = task.status === 'done';
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && !done;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <input
        type="checkbox"
        checked={done}
        onChange={() => onToggle(task)}
        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
      />
      <span style={{ flex: 1, fontSize: '14px', textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
        {task.title}
      </span>
      {overdue && <span style={{ fontSize: '11px', color: 'var(--error)', fontWeight: '500' }}>OVERDUE</span>}
      {task.priority && task.priority !== 'medium' && <Badge type={task.priority} label={task.priority} />}
    </div>
  );
}
