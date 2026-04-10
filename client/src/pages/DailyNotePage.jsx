import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDailyNote, generateDailyNote, updateNote } from '../api/notes';
import { getTodayTasks } from '../api/tasks';
import { getHistory } from '../api/pomodoro';
import Button from '../components/common/Button';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export default function DailyNotePage() {
  const { date } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [content, setContent] = useState('');
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    Promise.all([
      generateDailyNote(date).then(n => { setNote(n); setContent(typeof n.content === 'string' ? n.content : ''); }),
      getTodayTasks().then(setTasks),
      getHistory({ from: date, to: date }).then(d => setSessions(d.sessions || [])),
    ]).catch(() => toast.error('Failed to load daily note'));
  }, [date]);

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
  const parsed = parseISO(date);

  const prevDay = () => { const d = new Date(parsed); d.setDate(d.getDate() - 1); navigate(`/daily/${format(d, 'yyyy-MM-dd')}`); };
  const nextDay = () => { const d = new Date(parsed); d.setDate(d.getDate() + 1); navigate(`/daily/${format(d, 'yyyy-MM-dd')}`); };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)' }}>
          <button onClick={prevDay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px' }}>←</button>
          <span style={{ fontWeight: '600' }}>{format(parsed, 'EEEE, MMMM d, yyyy')}</span>
          <button onClick={nextDay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px' }}>→</button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{saving ? '💾 Saving...' : 'Auto-saved'}</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '32px 48px' }}>
          <textarea value={content} onChange={handleChange} style={{ width: '100%', minHeight: '70vh', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', resize: 'none', lineHeight: 1.7, fontFamily: 'inherit' }} placeholder="Write your daily note here..." />
        </div>
      </div>

      <div style={{ width: '260px', borderLeft: '1px solid var(--border)', background: 'var(--surface)', overflow: 'auto', padding: '20px' }}>
        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '16px' }}>Day Summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          <StatCard label="Tasks done" value={tasks.filter(t => t.status === 'done').length} />
          <StatCard label="Focus mins" value={focusMinutes} color="var(--primary)" />
        </div>

        <div style={{ fontWeight: '500', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Tasks</div>
        {tasks.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>No tasks today</div> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
            {tasks.slice(0, 6).map(t => (
              <div key={t._id} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
                <span style={{ color: t.status === 'done' ? 'var(--success)' : 'var(--text-muted)' }}>{t.status === 'done' ? '✓' : '○'}</span>
                <span style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{t.title}</span>
              </div>
            ))}
          </div>
        }

        {sessions.length > 0 && (
          <>
            <div style={{ fontWeight: '500', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Focus sessions</div>
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
