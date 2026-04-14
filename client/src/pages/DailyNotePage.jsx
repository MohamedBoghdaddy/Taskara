import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateDailyNote, updateNote } from '../api/notes';
import { getTodayTasks } from '../api/tasks';
import { getHistory } from '../api/pomodoro';
import Button from '../components/common/Button';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  CalendarIcon, ChevronLeft, ChevronRight, SaveIcon, CheckCircleIcon,
  TimerIcon, TaskIcon, NoteIcon, NodeIcon,
} from '../components/common/Icons';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export default function DailyNotePage() {
  const { date } = useParams();
  const navigate = useNavigate();
  const resolvedDate = date === 'today' || !date
    ? format(new Date(), 'yyyy-MM-dd')
    : date;
  const [note, setNote] = useState(null);
  const [content, setContent] = useState('');
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const parsed = parseISO(resolvedDate);
  const hasValidDate = !Number.isNaN(parsed.getTime());

  useEffect(() => {
    if (!hasValidDate) {
      toast.error('Invalid daily note date');
      navigate(`/daily/${format(new Date(), 'yyyy-MM-dd')}`, { replace: true });
      return undefined;
    }

    Promise.all([
      generateDailyNote(resolvedDate).then(n => { setNote(n); setContent(typeof n.content === 'string' ? n.content : ''); }),
      getTodayTasks().then(setTasks),
      getHistory({ from: resolvedDate, to: resolvedDate }).then(d => setSessions(d.sessions || [])),
    ]).catch(() => toast.error('Failed to load daily note'));
    return undefined;
  }, [date, hasValidDate, navigate, resolvedDate]);

  const scheduleAutosave = useCallback((newContent) => {
    if (!note) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try { await updateNote(note._id, { content: newContent, contentText: newContent }); }
      catch { toast.error('Autosave failed'); }
      finally { setSaving(false); }
    }, 1000);
  }, [note]);

  const handleChange = e => { setContent(e.target.value); scheduleAutosave(e.target.value); };

  const focusMinutes = sessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);

  const prevDay = () => { const d = new Date(parsed); d.setDate(d.getDate() - 1); navigate(`/daily/${format(d, 'yyyy-MM-dd')}`); };
  const nextDay = () => { const d = new Date(parsed); d.setDate(d.getDate() + 1); navigate(`/daily/${format(d, 'yyyy-MM-dd')}`); };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)' }}>
          <Tooltip content="Previous day" placement="bottom">
            <button
              onClick={prevDay}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft />
            </button>
          </Tooltip>
          <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarIcon size="sm" style={{ color: 'var(--primary)' }} />
            {format(parsed, 'EEEE, MMMM d, yyyy')}
          </span>
          <Tooltip content="Next day" placement="bottom">
            <button
              onClick={nextDay}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight />
            </button>
          </Tooltip>
          <span style={{ flex: 1 }} />
          <Button size="sm" variant="secondary" onClick={() => navigate(`/daily/${format(new Date(), 'yyyy-MM-dd')}`)}>
            Today
          </Button>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {saving ? <><SaveIcon size="xs" /> Saving...</> : 'Auto-saved'}
          </span>
        </div>

        {/* Editor area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '32px 48px' }}>
          <FeatureGuide
            storageKey="daily-note-page"
            title="Daily Note"
            icon={<CalendarIcon />}
            description="A daily journal tied to a specific date — automatically generated each day. Use it to plan your day, reflect on progress, and record what happened."
            steps={[
              {
                icon: <NoteIcon />,
                title: 'Write freely',
                body: 'Type your plans, reflections, or notes for the day. Markdown is fully supported.',
              },
              {
                icon: <SaveIcon />,
                title: 'Autosave',
                body: 'Your daily note saves automatically 1 second after you stop typing.',
              },
              {
                icon: <ChevronLeft />,
                title: 'Navigate days',
                body: 'Use the left and right arrows in the toolbar to browse to any past or future day.',
              },
              {
                icon: <TaskIcon />,
                title: 'See today\'s tasks',
                body: 'The sidebar shows all tasks due today with their completion status at a glance.',
              },
              {
                icon: <TimerIcon />,
                title: 'Focus sessions',
                body: 'Pomodoro sessions logged on this day appear in the sidebar with duration totals.',
              },
            ]}
            tips={[
              'Start each morning by writing 3 intentions for the day',
              'Use the evening to reflect on what you accomplished',
              'Focus minutes help you see how productive the day was',
              'Navigate to any past date to review your history',
            ]}
            accentColor="var(--success)"
          />
          <textarea
            value={content}
            onChange={handleChange}
            style={{ width: '100%', minHeight: '70vh', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', resize: 'none', lineHeight: 1.7, fontFamily: 'inherit' }}
            placeholder="Write your daily note here..."
          />
        </div>
      </div>

      {/* Right sidebar */}
      <div style={{ width: '260px', borderLeft: '1px solid var(--border)', background: 'var(--surface)', overflow: 'auto', padding: '20px' }}>
        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '16px' }}>Day Summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          <StatCard label="Tasks done" value={tasks.filter(t => t.status === 'done').length} />
          <StatCard label="Focus mins" value={focusMinutes} color="var(--primary)" />
        </div>

        <div style={{ fontWeight: '500', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <TaskIcon size="xs" /> Tasks
        </div>
        {tasks.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>No tasks today</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
            {tasks.slice(0, 6).map(t => (
              <div key={t._id} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
                <span style={{ color: t.status === 'done' ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  {t.status === 'done' ? <CheckCircleIcon size="xs" /> : <NodeIcon size="xs" style={{ opacity: 0.4 }} />}
                </span>
                <span style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {t.title}
                </span>
              </div>
            ))}
          </div>
        )}

        {sessions.length > 0 && (
          <>
            <div style={{ fontWeight: '500', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <TimerIcon size="xs" /> Focus sessions
            </div>
            {sessions.map(s => (
              <div key={s._id} style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
                <span>{s.taskId?.title || 'General focus'}</span>
                <span>{s.actualMinutes}m</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'var(--text-primary)' }) {
  return (
    <div style={{ padding: '10px', background: 'var(--surface-alt)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
      <div style={{ fontSize: '22px', fontWeight: '700', color }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
    </div>
  );
}
