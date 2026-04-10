import React, { useState, useEffect } from 'react';
import { getTasks } from '../api/tasks';
import { getReminders } from '../api/index';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const navigate = useNavigate();

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  useEffect(() => {
    Promise.all([
      getTasks({ from: calStart.toISOString(), to: calEnd.toISOString() }).then(d => setTasks(d.tasks || [])),
      getReminders({ from: calStart.toISOString(), to: calEnd.toISOString() }).then(setReminders),
    ]).catch(() => toast.error('Failed to load calendar data'));
  }, [current]);

  const getTasksForDay = (day) => tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));
  const getRemindersForDay = (day) => reminders.filter(r => r.remindAt && isSameDay(new Date(r.remindAt), day));

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>{format(current, 'MMMM yyyy')}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1))} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-primary)' }}>←</button>
          <button onClick={() => setCurrent(new Date())} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px' }}>Today</button>
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1))} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-primary)' }}>→</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>{d}</div>
        ))}
        {days.map((day, i) => {
          const dayTasks = getTasksForDay(day);
          const dayReminders = getRemindersForDay(day);
          const isCurrentMonth = isSameMonth(day, current);
          const isTodayDay = isToday(day);
          return (
            <div key={i} onClick={() => navigate(`/daily/${format(day, 'yyyy-MM-dd')}`)} style={{ minHeight: '90px', padding: '6px', border: '1px solid var(--border)', background: isTodayDay ? 'var(--primary-soft, #E0E7FF)' : isCurrentMonth ? 'var(--surface)' : 'var(--surface-alt)', cursor: 'pointer', borderLeft: i % 7 === 0 ? 'none' : '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
              onMouseLeave={e => e.currentTarget.style.background = isTodayDay ? 'var(--primary-soft, #E0E7FF)' : isCurrentMonth ? 'var(--surface)' : 'var(--surface-alt)'}>
              <div style={{ fontWeight: isTodayDay ? '700' : '400', fontSize: '13px', color: isTodayDay ? 'var(--primary)' : isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)', marginBottom: '4px' }}>{format(day, 'd')}</div>
              {dayTasks.slice(0, 2).map(t => (
                <div key={t._id} style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '3px', background: t.status === 'done' ? '#DCFCE7' : '#DBEAFE', color: t.status === 'done' ? '#16A34A' : '#1D4ED8', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
              ))}
              {dayReminders.slice(0, 1).map(r => (
                <div key={r._id} style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '3px', background: '#FEF3C7', color: '#D97706', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🔔 {r.title}</div>
              ))}
              {dayTasks.length > 2 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{dayTasks.length - 2} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
