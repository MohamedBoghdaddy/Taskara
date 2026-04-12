import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../api/index';
import { getTodayTasks } from '../api/tasks';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  TodayIcon, InboxIcon, NoteIcon, TimerIcon, AIIcon,
  CheckIcon, CheckCircleIcon, TaskIcon, AnalyticsIcon,
  TrophyIcon, FireIcon,
} from '../components/common/Icons';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    Promise.all([
      getDashboardStats().then(setStats),
      getTodayTasks().then(setTasks),
    ]).catch(() => toast.error('Failed to load dashboard'));
  }, []);

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>
          Welcome back, {user?.name?.split(' ')[0]} <TrophyIcon style={{ color: 'var(--primary)', marginLeft: '4px' }} />
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <FeatureGuide
        storageKey="dashboard-guide"
        title="Dashboard"
        icon={<AnalyticsIcon />}
        description="Your command centre — see stats at a glance, review today's tasks, and jump to any feature quickly."
        steps={[
          {
            icon: <AnalyticsIcon />,
            title: 'Stats cards',
            body: 'Click any stat card to navigate directly to the related section (Tasks, Analytics, Notes).',
          },
          {
            icon: <TaskIcon />,
            title: 'Today\'s Tasks',
            body: 'Tasks due today appear here. Click "Open Today" for the full Today view with editing.',
          },
          {
            icon: <FireIcon />,
            title: 'Quick actions',
            body: 'Use the right-side shortcuts to jump to Inbox, Daily Note, Focus Timer, and more.',
          },
        ]}
        tips={[
          'Stats refresh each time you load the page',
          'Overdue tasks appear in red — tackle them first',
          'Focus this week shows total Pomodoro hours',
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Total Tasks', value: stats?.taskStats?.total || 0, href: '/tasks' },
          { label: 'Completed', value: stats?.taskStats?.completed || 0, color: 'var(--success)', href: '/analytics' },
          { label: 'Overdue', value: stats?.overdueCount || 0, color: stats?.overdueCount ? 'var(--error)' : undefined, href: '/tasks' },
          { label: 'Notes', value: stats?.noteCount || 0, href: '/notes' },
          { label: 'Focus this week', value: `${Math.round((stats?.focusStats?.totalMinutes || 0) / 60 * 10) / 10}h`, color: 'var(--primary)', href: '/analytics' },
        ].map(s => (
          <Link key={s.label} to={s.href} style={{ textDecoration: 'none' }}>
            <div style={{ padding: '18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: s.color || 'var(--text-primary)' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600' }}>Today's Tasks</h2>
            <Link to="/today" style={{ fontSize: '13px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Open Today <TodayIcon size="xs" />
            </Link>
          </div>
          {tasks.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', fontSize: '14px' }}>No tasks for today.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {tasks.slice(0, 8).map(t => (
                <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '14px' }}>
                  <span style={{ color: t.status === 'done' ? 'var(--success)' : 'var(--text-muted)', fontSize: '12px' }}>
                    {t.status === 'done' ? <CheckCircleIcon size="xs" color="var(--success)" /> : <CheckIcon size="xs" />}
                  </span>
                  <span style={{ flex: 1, textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { to: '/today',          icon: <TodayIcon />,  label: 'Today Page' },
            { to: '/inbox',          icon: <InboxIcon />,  label: 'Inbox' },
            { to: `/daily/${today}`, icon: <NoteIcon />,   label: 'Daily Note' },
            { to: '/pomodoro',       icon: <TimerIcon />,  label: 'Focus Timer' },
            { to: '/notes',          icon: <NoteIcon />,   label: 'Notes' },
            { to: '/ai',             icon: <AIIcon />,     label: 'AI Assistant' },
          ].map(item => (
            <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <span style={{ color: 'var(--primary)', width: '16px', textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
