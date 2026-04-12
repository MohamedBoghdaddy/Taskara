import React, { useState, useEffect, useRef } from 'react';
import { getTasks } from '../api/tasks';
import { getProjects } from '../api/projects';
import toast from 'react-hot-toast';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PRIORITY_COLOR = { urgent: '#ef4444', high: '#f97316', medium: '#6366f1', low: '#94a3b8' };
const DAY_PX = 24; // pixels per day

function dateToX(date, minDate) {
  const diff = Math.floor((new Date(date) - new Date(minDate)) / 86400000);
  return diff * DAY_PX;
}

export default function TimelinePage() {
  const [tasks,    setTasks]    = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [zoom,     setZoom]     = useState(1);
  const scrollRef = useRef(null);

  useEffect(() => {
    Promise.all([
      getTasks({ limit: 200 }).then(d => d.tasks || d),
      getProjects().then(d => d.projects || d),
    ]).then(([t, p]) => {
      setTasks(t.filter(task => task.startDate || task.dueDate));
      setProjects(p);
    }).catch(() => toast.error('Failed to load timeline'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tasks.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  if (!filtered.length && !loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No tasks with dates</h2>
        <p style={{ fontSize: '14px' }}>Add start dates or due dates to your tasks to see them on the timeline.</p>
      </div>
    );
  }

  const allDates = filtered.flatMap(t => [t.startDate, t.dueDate].filter(Boolean));
  if (!allDates.length && !loading) return null;

  const minDate  = new Date(Math.min(...allDates.map(d => new Date(d))));
  const maxDate  = new Date(Math.max(...allDates.map(d => new Date(d))));
  minDate.setDate(minDate.getDate() - 3);
  maxDate.setDate(maxDate.getDate() + 7);

  const totalDays = Math.ceil((maxDate - minDate) / 86400000);
  const totalW    = totalDays * DAY_PX * zoom;
  const today     = new Date();
  const todayX    = dateToX(today, minDate) * zoom;

  // Group days by month for header
  const months = [];
  let cur = new Date(minDate);
  while (cur <= maxDate) {
    const key = `${cur.getFullYear()}-${cur.getMonth()}`;
    if (!months.length || months[months.length-1].key !== key) {
      months.push({ key, label: `${MONTH_NAMES[cur.getMonth()]} ${cur.getFullYear()}`, x: dateToX(cur, minDate) * zoom, days: 0 });
    }
    months[months.length-1].days++;
    cur.setDate(cur.getDate() + 1);
  }

  const projectMap = {};
  projects.forEach(p => { projectMap[p._id] = p.name; });

  const grouped = {};
  filtered.forEach(t => {
    const key = t.projectId ? (projectMap[t.projectId] || 'Project') : 'No Project';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  const ROW_H  = 36;
  const LABEL_W = 200;

  return (
    <div style={{ padding: '24px 32px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700' }}>📅 Timeline / Roadmap</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Filter */}
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '13px' }}>
            <option value="all">All statuses</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          {/* Zoom */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0.5, 1, 2].map(z => (
              <button key={z} onClick={() => setZoom(z)} style={{ padding: '5px 10px', border: 'none', borderRadius: 'var(--radius)', background: zoom === z ? 'var(--primary)' : 'var(--surface-alt)', color: zoom === z ? '#fff' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>
                {z === 0.5 ? 'Q' : z === 1 ? 'M' : 'W'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}>
          {/* Sticky header area */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ width: LABEL_W, minWidth: LABEL_W, borderRight: '1px solid var(--border)', padding: '8px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Task</div>
            <div ref={scrollRef} style={{ flex: 1, overflow: 'hidden', position: 'relative', height: '36px' }}>
              <div style={{ width: totalW, height: '100%', position: 'relative' }}>
                {months.map(m => (
                  <div key={m.key} style={{ position: 'absolute', left: m.x, top: 0, width: m.days * DAY_PX * zoom, fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', padding: '4px 8px', borderRight: '1px solid var(--border)', height: '100%', boxSizing: 'border-box', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
            {/* Labels column */}
            <div style={{ width: LABEL_W, minWidth: LABEL_W, borderRight: '1px solid var(--border)', flexShrink: 0 }}>
              {Object.entries(grouped).map(([group, gtasks]) => (
                <React.Fragment key={group}>
                  <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', background: 'var(--surface-alt)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{group}</div>
                  {gtasks.map(t => (
                    <div key={t._id} style={{ height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.title}>{t.title}</span>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>

            {/* Gantt bars */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <div style={{ width: Math.max(totalW, 600), position: 'relative' }}>
                {/* Today line */}
                {todayX >= 0 && todayX <= totalW && (
                  <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: '2px', background: 'var(--error)', opacity: 0.7, zIndex: 10, pointerEvents: 'none' }} />
                )}

                {Object.entries(grouped).map(([group, gtasks]) => (
                  <React.Fragment key={group}>
                    {/* Group header row */}
                    <div style={{ height: 28, background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', position: 'relative' }}>
                      {/* vertical gridlines */}
                      {months.map(m => <div key={m.key} style={{ position: 'absolute', left: m.x, top: 0, bottom: 0, width: '1px', background: 'var(--border)', opacity: 0.5 }} />)}
                    </div>
                    {gtasks.map(t => {
                      const start  = t.startDate || t.dueDate;
                      const end    = t.dueDate   || t.startDate;
                      const barX   = dateToX(start, minDate) * zoom;
                      const barW   = Math.max((dateToX(end, minDate) - dateToX(start, minDate)) * zoom + DAY_PX * zoom, 8);
                      const isDone = t.status === 'done';
                      return (
                        <div key={t._id} style={{ height: ROW_H, position: 'relative', borderBottom: '1px solid var(--border)' }}>
                          {months.map(m => <div key={m.key} style={{ position: 'absolute', left: m.x, top: 0, bottom: 0, width: '1px', background: 'var(--border)', opacity: 0.3 }} />)}
                          <div
                            style={{
                              position: 'absolute', left: barX, top: '50%', transform: 'translateY(-50%)',
                              width: barW, height: 20, borderRadius: '4px',
                              background: isDone ? 'var(--success)' : (PRIORITY_COLOR[t.priority] || 'var(--primary)'),
                              opacity: isDone ? 0.6 : 0.85,
                              display: 'flex', alignItems: 'center', padding: '0 6px',
                              overflow: 'hidden', cursor: 'default',
                            }}
                            title={`${t.title} (${t.status})`}
                          >
                            <span style={{ fontSize: '11px', color: '#fff', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
