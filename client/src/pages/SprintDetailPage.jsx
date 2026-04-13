import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as sprintApi from '../api/sprints';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import FeatureGuide from '../components/common/FeatureGuide';
import {
  SprintIcon, CheckCircleIcon, TimerIcon, BacklogIcon,
  CloseIcon, ArrowLeft, CheckIcon, PlayIcon, FlashIcon,
} from '../components/common/Icons';

const COL_STATUS = { 'Todo': 'todo', 'In Progress': 'in_progress', 'Done': 'done' };
const COLS = ['Todo', 'In Progress', 'Done'];
const PRIORITY_COLOR = { urgent: '#ef4444', high: '#f97316', medium: '#6366f1', low: '#6b7280' };

// ── Burndown chart ────────────────────────────────────────────────────────────
function BurndownChart({ sprint, tasks }) {
  if (!sprint.startDate || !sprint.endDate) return null;
  const start  = new Date(sprint.startDate);
  const end    = new Date(sprint.endDate);
  const total  = Math.max(Math.ceil((end - start) / 86400000), 1);
  const today  = Math.min(Math.ceil((new Date() - start) / 86400000), total);
  const done   = tasks.filter(t => t.status === 'done').length;
  const count  = tasks.length;

  const ideal  = (day) => count - (count / total) * day;
  const actual = (day) => {
    if (day === 0) return count;
    if (day > today) return null;
    return Math.max(count - (done / Math.max(today, 1)) * day, 0);
  };

  const W = 520, H = 160, PAD = 36;
  const x = (day) => PAD + (day / total) * (W - PAD * 2);
  const y = (val) => PAD + ((count - val) / Math.max(count, 1)) * (H - PAD * 2);

  const points    = Array.from({ length: today + 1 }, (_, d) => ({ d, a: actual(d) })).filter(p => p.a !== null);
  const idealPts  = [{ d: 0 }, { d: total }];
  const toSVGLine = (pts, key) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.d).toFixed(1)} ${y(key === 'ideal' ? ideal(p.d) : p.a).toFixed(1)}`).join(' ');

  return (
    <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '20px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>Burndown Chart</h3>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W }}>
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={PAD} y1={y(count * t)} x2={W - PAD} y2={y(count * t)} stroke="var(--border)" strokeWidth="1" />
        ))}
        <path d={toSVGLine(idealPts, 'ideal')} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 3" />
        {points.length > 1 && (
          <path d={toSVGLine(points, 'actual')} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
        )}
        <text x={PAD} y={H - 4} fill="var(--text-muted)" fontSize="10">Day 0</text>
        <text x={W - PAD - 10} y={H - 4} fill="var(--text-muted)" fontSize="10">Day {total}</text>
        <text x={4} y={PAD + 4} fill="var(--text-muted)" fontSize="10">{count}</text>
        <text x={4} y={H - PAD + 4} fill="var(--text-muted)" fontSize="10">0</text>
        <line x1={W - 130} y1={14} x2={W - 110} y2={14} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 2" />
        <text x={W - 105} y={18} fill="var(--text-muted)" fontSize="10">Ideal</text>
        <line x1={W - 60} y1={14} x2={W - 40} y2={14} stroke="var(--primary)" strokeWidth="2.5" />
        <text x={W - 35} y={18} fill="var(--text-muted)" fontSize="10">Actual</text>
      </svg>
    </div>
  );
}

export default function SprintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sprint,    setSprint]  = useState(null);
  const [tasks,     setTasks]   = useState([]);
  const [stats,     setStats]   = useState(null);
  const [loading,   setLoading] = useState(true);
  const [dragTaskId,setDragTaskId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sprintData, statsData] = await Promise.all([
        sprintApi.getSprint(id),
        sprintApi.getSprintStats(id),
      ]);
      setSprint(sprintData);
      setTasks(sprintData.tasks || []);
      setStats(statsData);
    } catch { toast.error('Failed to load sprint'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const moveTask = async (taskId, newStatus) => {
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    try {
      await sprintApi.updateSprintTask(taskId, { status: newStatus });
    } catch {
      toast.error('Failed to update task');
      load();
    }
  };

  const removeFromSprint = async (taskId) => {
    try {
      await sprintApi.removeTaskFromSprint(id, taskId);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      toast.success('Removed from sprint');
    } catch { toast.error('Failed to remove task'); }
  };

  const handleDrop = (e, colStatus) => {
    e.preventDefault();
    if (dragTaskId) moveTask(dragTaskId, colStatus);
    setDragTaskId(null);
  };

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading sprint…</div>;
  if (!sprint)  return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Sprint not found.</div>;

  const daysLeft    = sprint.endDate ? Math.ceil((new Date(sprint.endDate) - new Date()) / 86400000) : null;
  const pct         = stats?.total ? stats.completion : 0;
  const statusColor = sprint.status === 'active' ? 'var(--success)' : sprint.status === 'completed' ? 'var(--primary)' : 'var(--text-muted)';

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1100px' }}>
      {/* How to use guide */}
      <FeatureGuide
        storageKey="sprint-detail-guide"
        title="Sprint Board"
        icon={<SprintIcon />}
        description="Track your active sprint with a Kanban board and burndown chart. Drag tasks between columns to update their status in real time."
        steps={[
          { icon: <BacklogIcon />, title: 'Add tasks', body: 'Click "Add Tasks" to pull tasks from the backlog into this sprint.' },
          { icon: <SprintIcon />, title: 'Drag to move', body: 'Drag a task card from one column to another to change its status.' },
          { icon: <CheckCircleIcon />, title: 'Burndown chart', body: 'The chart shows ideal vs. actual progress — aim to stay at or below the ideal line.' },
          { icon: <FlashIcon />, title: 'Velocity', body: 'Complete the sprint to record velocity (story points done).' },
        ]}
        tips={[
          'Keep the In Progress column short — focus on finishing tasks',
          'Update task status daily for accurate burndown tracking',
          'Use story points to measure velocity across sprints',
        ]}
        accentColor="var(--primary)"
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <button
              onClick={() => navigate('/sprints')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <ArrowLeft />
            </button>
            <SprintIcon color={statusColor} />
            <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>{sprint.name}</h1>
            <span style={{
              fontSize: '11px', fontWeight: '600', padding: '2px 9px',
              borderRadius: '99px', background: `${statusColor}22`,
              color: statusColor, textTransform: 'capitalize',
            }}>
              {sprint.status}
            </span>
          </div>
          {sprint.goal && <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 0 34px' }}>{sprint.goal}</p>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {sprint.status === 'active'   && <Button variant="secondary" size="sm" onClick={() => navigate('/backlog')}><BacklogIcon size="xs" /> Add Tasks</Button>}
          {sprint.status === 'planning' && <Button variant="primary"   size="sm" onClick={async () => { await sprintApi.updateSprint(id, { status: 'active' }); load(); }}><PlayIcon size="xs" /> Start Sprint</Button>}
          {sprint.status === 'active'   && <Button variant="secondary" size="sm" onClick={async () => { await sprintApi.updateSprint(id, { status: 'completed' }); load(); }}><CheckIcon size="xs" /> Complete Sprint</Button>}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Total tasks',  value: stats?.total      || 0 },
          { label: 'Done',         value: stats?.done       || 0, color: 'var(--success)' },
          { label: 'In Progress',  value: stats?.inProgress || 0, color: 'var(--primary)' },
          { label: 'Completion',   value: `${pct}%`,              color: pct === 100 ? 'var(--success)' : 'var(--primary)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color || 'var(--text-primary)' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          <span>Sprint progress</span>
          <span>
            {daysLeft !== null
              ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`)
              : ''}
          </span>
        </div>
        <div style={{ height: '8px', background: 'var(--surface-alt)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--success)', width: `${pct}%`, borderRadius: '4px', transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* Burndown */}
      <BurndownChart sprint={sprint} tasks={tasks} />

      {/* Kanban board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {COLS.map(col => {
          const colStatus = COL_STATUS[col];
          const colTasks  = tasks.filter(t => t.status === colStatus);
          return (
            <div
              key={col}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, colStatus)}
              style={{ background: 'var(--surface-alt)', borderRadius: 'var(--radius)', padding: '12px', minHeight: '200px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col}</span>
                <span style={{ fontSize: '11px', background: 'var(--border)', borderRadius: '99px', padding: '1px 7px', color: 'var(--text-muted)' }}>{colTasks.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {colTasks.map(task => (
                  <div
                    key={task._id}
                    draggable
                    onDragStart={() => setDragTaskId(task._id)}
                    onDragEnd={() => setDragTaskId(null)}
                    style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', padding: '10px 12px', cursor: 'grab',
                      opacity: dragTaskId === task._id ? 0.5 : 1,
                      borderLeft: `3px solid ${PRIORITY_COLOR[task.priority] || 'var(--border)'}`,
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>{task.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {task.estimatedPoints > 0 && (
                          <span style={{ fontSize: '10px', background: 'var(--primary)22', color: 'var(--primary)', borderRadius: '4px', padding: '1px 5px', fontWeight: '600' }}>
                            {task.estimatedPoints}pt
                          </span>
                        )}
                        <span style={{ fontSize: '10px', color: PRIORITY_COLOR[task.priority], textTransform: 'capitalize' }}>{task.priority}</span>
                      </div>
                      <button
                        onClick={() => removeFromSprint(task._id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                        title="Remove from sprint"
                      >
                        <CloseIcon size="xs" />
                      </button>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '20px 0', opacity: 0.6 }}>
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
