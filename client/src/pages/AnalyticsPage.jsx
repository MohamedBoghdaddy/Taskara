import React, { useState, useEffect } from 'react';
import { getTaskAnalytics, getFocusAnalytics, getFocusScore, getBurnout, getWeeklyTrend, getAnalyticsHabits } from '../api/index';
import { exportAnalytics, exportTasks } from '../api/exports';
import toast from 'react-hot-toast';
import FeatureGuide from '../components/common/FeatureGuide';
import {
  AnalyticsIcon, TimerIcon, TrophyIcon, FireIcon,
  TrendUpIcon, CheckCircleIcon, LineChartIcon,
} from '../components/common/Icons';

// ── Focus score ring ──────────────────────────────────────────────────────────
function ScoreRing({ score = 0, label = 'Focus Score' }) {
  const r = 36, cx = 44, cy = 44, stroke = 8;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
      <svg width={88} height={88} viewBox="0 0 88 88" style={{ display: 'block', margin: '0 auto 8px' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x={cx} y={cy + 6} textAnchor="middle" fill={color} fontSize="18" fontWeight="700">{score}</text>
      </svg>
      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: '11px', color, marginTop: '2px' }}>{score >= 70 ? 'Great!' : score >= 40 ? 'Getting there' : 'Needs work'}</div>
    </div>
  );
}

// ── Trend arrow ───────────────────────────────────────────────────────────────
function TrendBadge({ change }) {
  if (change === undefined || change === null) return null;
  const up    = change >= 0;
  const color = up ? '#10b981' : '#ef4444';
  return (
    <span style={{ fontSize: '11px', fontWeight: '600', color, background: `${color}22`, borderRadius: '99px', padding: '2px 7px' }}>
      {up ? '↑' : '↓'} {Math.abs(change)}%
    </span>
  );
}

// ── 30-day habit heatmap ──────────────────────────────────────────────────────
function HabitHeatmap({ entries = [] }) {
  if (!entries.length) return null;
  const maxMin = Math.max(...entries.map(e => e.focusMinutes || 0), 1);
  return (
    <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '24px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        🔥 Focus Heatmap (last {entries.length} days)
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
        {entries.map((e, i) => {
          const intensity = Math.min((e.focusMinutes || 0) / maxMin, 1);
          const bg = intensity === 0 ? 'var(--surface-alt)' : `rgba(99,102,241,${0.15 + intensity * 0.85})`;
          return (
            <div key={i} title={`${e.date}: ${e.focusMinutes || 0}m focus, ${e.pomodoroCount || 0} sessions`}
              style={{ width: 16, height: 16, borderRadius: '3px', background: bg, cursor: 'default', flexShrink: 0 }} />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
        <span>Less</span>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          {[0, 0.25, 0.5, 0.75, 1].map(v => (
            <div key={v} style={{ width: 12, height: 12, borderRadius: '2px', background: v === 0 ? 'var(--surface-alt)' : `rgba(99,102,241,${0.15 + v * 0.85})` }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [taskStats,   setTaskStats]   = useState(null);
  const [focusStats,  setFocusStats]  = useState(null);
  const [focusScore,  setFocusScore]  = useState(null);
  const [burnout,     setBurnout]     = useState(null);
  const [trend,       setTrend]       = useState(null);
  const [habitData,   setHabitData]   = useState({ entries: [], streak: null });
  const [loading,     setLoading]     = useState(true);
  const [range,       setRange]       = useState('7d');

  useEffect(() => {
    const now = new Date(), from = new Date();
    if (range === '7d') from.setDate(from.getDate() - 7);
    else if (range === '30d') from.setDate(from.getDate() - 30);
    else from.setDate(from.getDate() - 90);
    const params = { from: from.toISOString(), to: now.toISOString() };
    setLoading(true);
    Promise.allSettled([
      getTaskAnalytics(params).then(setTaskStats),
      getFocusAnalytics(params).then(setFocusStats),
      getFocusScore().then(setFocusScore),
      getBurnout().then(setBurnout),
      getWeeklyTrend().then(setTrend),
      getAnalyticsHabits(30).then(setHabitData),
    ]).finally(() => setLoading(false));
  }, [range]);

  const focusDaily = focusStats?.daily ? Object.entries(focusStats.daily).sort((a,b) => a[0].localeCompare(b[0])) : [];
  const maxMins    = focusDaily.reduce((m, [,v]) => Math.max(m, v.minutes), 1);
  const streak     = habitData?.streak;

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AnalyticsIcon color="var(--primary)" /> Analytics
        </h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['7d','30d','90d'].map(r => (
            <button key={r} onClick={() => setRange(r)} style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '13px', background: range === r ? 'var(--primary)' : 'var(--surface-alt)', color: range === r ? '#fff' : 'var(--text-secondary)', fontWeight: range === r ? '600' : '400' }}>{r}</button>
          ))}
          <button onClick={() => exportTasks()} style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>⬇ Tasks CSV</button>
          <button onClick={() => exportAnalytics()} style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>⬇ Analytics CSV</button>
        </div>
      </div>

      <FeatureGuide storageKey="analytics-guide" title="Analytics" icon={<AnalyticsIcon />}
        description="Track productivity — focus hours, task completion, streaks, burnout risk."
        steps={[
          { icon: <LineChartIcon />, title: 'Focus chart', body: 'Daily focus minutes from Pomodoro sessions.' },
          { icon: <TrendUpIcon />,  title: 'Weekly trend', body: 'Week-over-week % change for sessions, tasks, minutes.' },
          { icon: <FireIcon />,     title: 'Burnout alert', body: 'AI detects declining patterns and warns you early.' },
        ]}
        tips={['Consistency beats intensity — 4 sessions/day beats 8 one day', '80%+ completion rate is excellent', 'Red burnout = rest day']}
        accentColor="var(--primary)"
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <>
          {/* Burnout alert */}
          {burnout && burnout.risk !== 'none' && (
            <div style={{ padding: '14px 16px', borderRadius: 'var(--radius)', marginBottom: '20px', border: `1px solid ${burnout.risk === 'high' ? '#ef444488' : burnout.risk === 'medium' ? '#f59e0b88' : '#6366f188'}`, background: burnout.risk === 'high' ? '#ef444412' : burnout.risk === 'medium' ? '#f59e0b12' : '#6366f112' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px' }}>{burnout.risk === 'high' ? '🔴' : burnout.risk === 'medium' ? '🟡' : '🔵'}</span>
                <span style={{ fontWeight: '700', fontSize: '14px' }}>Burnout Risk: {burnout.risk.toUpperCase()}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 4px 26px' }}>{burnout.message}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500', margin: '0 0 0 26px' }}>💡 {burnout.recommendation}</p>
            </div>
          )}

          {/* Top row: focus score + streak + weekly trend */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '12px', marginBottom: '20px', alignItems: 'start' }}>
            <ScoreRing score={focusScore?.score || 0} label="Today's Focus" />

            {/* Streak */}
            <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '4px' }}>🔥</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: streak?.current > 0 ? '#f97316' : 'var(--text-muted)' }}>{streak?.current || 0}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Day streak</div>
              {streak?.best > 0 && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Best: {streak.best} days</div>}
            </div>

            {/* Weekly trend */}
            {trend && (
              <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>vs last week</div>
                {[
                  { label: 'Sessions',  val: trend.sessions?.thisWeek, change: trend.sessions?.change },
                  { label: 'Minutes',   val: trend.minutes?.thisWeek,  change: trend.minutes?.change },
                  { label: 'Tasks done',val: trend.tasks?.thisWeek,    change: trend.tasks?.change },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.label}</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{row.val}</span>
                      <TrendBadge change={row.change} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Task stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Total tasks',  value: taskStats?.total || 0,     icon: <CheckCircleIcon /> },
              { label: 'Completed',    value: taskStats?.completed || 0,  color: 'var(--success)', icon: <TrophyIcon /> },
              { label: 'Overdue',      value: taskStats?.overdue || 0,    color: taskStats?.overdue ? 'var(--error)' : 'var(--text-muted)', icon: <FireIcon /> },
              { label: 'Completion %', value: taskStats?.total ? `${Math.round((taskStats.completed/taskStats.total)*100)}%` : '0%', color: 'var(--primary)', icon: <TrendUpIcon /> },
            ].map(s => (
              <div key={s.label} style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <div style={{ marginBottom: '6px', color: s.color || 'var(--text-muted)' }}>{s.icon}</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: s.color || 'var(--text-primary)' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Focus stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Total focus time', value: `${Math.round((focusStats?.totalMinutes || 0)/60*10)/10}h`, color: 'var(--primary)', icon: <TimerIcon /> },
              { label: 'Sessions',         value: focusStats?.totalSessions || 0, color: 'var(--primary)', icon: <AnalyticsIcon /> },
              { label: 'Avg session',      value: `${focusStats?.averageSessionMinutes || 0}m`, icon: <TimerIcon /> },
            ].map(s => (
              <div key={s.label} style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <div style={{ marginBottom: '6px', color: s.color || 'var(--text-muted)' }}>{s.icon}</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: s.color || 'var(--text-primary)' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Heatmap */}
          <HabitHeatmap entries={habitData?.entries || []} />

          {/* Focus chart */}
          {focusDaily.length > 0 && (
            <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '24px' }}>
              <h3 style={{ fontWeight: '600', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LineChartIcon color="var(--primary)" /> Daily Focus Time
              </h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
                {focusDaily.map(([day, val]) => (
                  <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '100%', background: 'var(--primary)', borderRadius: '3px 3px 0 0', height: `${(val.minutes/maxMins)*100}px`, minHeight: val.minutes > 0 ? '4px' : '0', transition: 'height 0.3s', opacity: 0.85 }} title={`${val.minutes}m`} />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', transform: 'rotate(-45deg)', transformOrigin: 'top left', marginTop: '8px', whiteSpace: 'nowrap' }}>{day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task status breakdown */}
          {taskStats?.byStatus?.length > 0 && (
            <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <h3 style={{ fontWeight: '600', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AnalyticsIcon color="var(--primary)" /> Tasks by Status
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {taskStats.byStatus.map(({ _id, count }) => (
                  <div key={_id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '80px', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{(_id||'unknown').replace('_',' ')}</span>
                    <div style={{ flex: 1, background: 'var(--surface-alt)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--primary)', borderRadius: '4px', width: `${(count/(taskStats.total||1))*100}%` }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600', minWidth: '20px' }}>{count}</span>
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
