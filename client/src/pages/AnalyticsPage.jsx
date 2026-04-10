import React, { useState, useEffect } from 'react';
import { getTaskAnalytics, getFocusAnalytics } from '../api/index';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const [taskStats, setTaskStats] = useState(null);
  const [focusStats, setFocusStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7d');

  useEffect(() => {
    const now = new Date(); const from = new Date();
    if (range === '7d') from.setDate(from.getDate() - 7);
    else if (range === '30d') from.setDate(from.getDate() - 30);
    else from.setDate(from.getDate() - 90);
    const params = { from: from.toISOString(), to: now.toISOString() };
    setLoading(true);
    Promise.all([
      getTaskAnalytics(params).then(setTaskStats),
      getFocusAnalytics(params).then(setFocusStats),
    ]).catch(() => toast.error('Failed to load analytics')).finally(() => setLoading(false));
  }, [range]);

  const focusDaily = focusStats?.daily ? Object.entries(focusStats.daily).sort((a,b) => a[0].localeCompare(b[0])) : [];
  const maxMins = focusDaily.reduce((m, [,v]) => Math.max(m, v.minutes), 1);

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Analytics</h1>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['7d','30d','90d'].map(r => (
            <button key={r} onClick={() => setRange(r)} style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '13px', background: range === r ? 'var(--primary)' : 'var(--surface-alt)', color: range === r ? '#fff' : 'var(--text-secondary)', fontWeight: range === r ? '600' : '400' }}>{r}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Loading...</div> : (
        <>
          {/* Task stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {[
              { label: 'Total tasks', value: taskStats?.total || 0 },
              { label: 'Completed', value: taskStats?.completed || 0, color: 'var(--success)' },
              { label: 'Overdue', value: taskStats?.overdue || 0, color: taskStats?.overdue ? 'var(--error)' : 'var(--text-muted)' },
              { label: 'Completion %', value: taskStats?.total ? `${Math.round((taskStats.completed/taskStats.total)*100)}%` : '0%', color: 'var(--primary)' },
            ].map(s => (
              <div key={s.label} style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: s.color || 'var(--text-primary)' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Focus stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {[
              { label: 'Total focus time', value: `${Math.round((focusStats?.totalMinutes || 0) / 60 * 10) / 10}h`, color: 'var(--primary)' },
              { label: 'Sessions', value: focusStats?.totalSessions || 0, color: 'var(--primary)' },
              { label: 'Avg session', value: `${focusStats?.averageSessionMinutes || 0}m` },
            ].map(s => (
              <div key={s.label} style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: s.color || 'var(--text-primary)' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Focus chart */}
          {focusDaily.length > 0 && (
            <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '24px' }}>
              <h3 style={{ fontWeight: '600', fontSize: '14px', marginBottom: '16px' }}>Daily Focus Time</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
                {focusDaily.map(([day, val]) => (
                  <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '100%', background: 'var(--primary)', borderRadius: '3px 3px 0 0', height: `${(val.minutes / maxMins) * 100}px`, minHeight: val.minutes > 0 ? '4px' : '0', transition: 'height 0.3s', opacity: 0.85 }} title={`${val.minutes}m`} />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', transform: 'rotate(-45deg)', transformOrigin: 'top left', marginTop: '8px', whiteSpace: 'nowrap' }}>{day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task status breakdown */}
          {taskStats?.byStatus?.length > 0 && (
            <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <h3 style={{ fontWeight: '600', fontSize: '14px', marginBottom: '16px' }}>Tasks by Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {taskStats.byStatus.map(({ _id, count }) => (
                  <div key={_id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '80px', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{(_id || 'unknown').replace('_', ' ')}</span>
                    <div style={{ flex: 1, background: 'var(--surface-alt)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--primary)', borderRadius: '4px', width: `${(count / (taskStats.total || 1)) * 100}%` }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', minWidth: '20px' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
