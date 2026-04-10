import React, { useState, useEffect, useRef } from 'react';
import { getActive, startSession, stopSession, getHistory } from '../api/pomodoro';
import { getTasks } from '../api/tasks';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const MODES = { focus: { label: 'Focus', minutes: 25, color: 'var(--primary)' }, short_break: { label: 'Short Break', minutes: 5, color: 'var(--success)' }, long_break: { label: 'Long Break', minutes: 15, color: 'var(--info, #3B82F6)' } };

export default function PomodoroPage() {
  const [mode, setMode] = useState('focus');
  const [session, setSession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [history, setHistory] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    getTasks({ status: 'in_progress' }).then(d => setTasks(d.tasks || []));
    getHistory({ limit: 10 }).then(d => setHistory(d.sessions || []));
    getActive().then(s => { if (s) { setSession(s); setRunning(true); setMode(s.type); } });
  }, []);

  useEffect(() => {
    if (running && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && running) {
      handleStop('completed');
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') { new Notification('Pomodoro complete! 🎉'); }
    }
    return () => clearInterval(intervalRef.current);
  }, [running, timeLeft]);

  useEffect(() => {
    if (!running) setTimeLeft(MODES[mode].minutes * 60);
  }, [mode, running]);

  const handleStart = async () => {
    try {
      const s = await startSession({ type: mode, plannedMinutes: MODES[mode].minutes, taskId: selectedTask || undefined });
      setSession(s); setRunning(true);
      toast.success(`${MODES[mode].label} session started`);
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to start session'); }
  };

  const handleStop = async (status = 'interrupted') => {
    if (!session) return;
    try {
      const s = await stopSession(session._id, { status });
      setRunning(false); setSession(null);
      setHistory(prev => [s, ...prev.slice(0, 9)]);
      if (status === 'completed') toast.success('Session complete! 🎉');
      else toast('Session stopped');
    } catch { toast.error('Failed to stop session'); }
  };

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  const totalSecs = MODES[mode].minutes * 60;
  const progress = ((totalSecs - timeLeft) / totalSecs) * 100;
  const modeColor = MODES[mode].color;
  const radius = 90; const circumference = 2 * Math.PI * radius;

  return (
    <div style={{ padding: '32px', maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '28px', textAlign: 'center' }}>Focus Timer</h1>

      {/* Mode selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '40px' }}>
        {Object.entries(MODES).map(([key, val]) => (
          <button key={key} onClick={() => !running && setMode(key)} style={{ padding: '8px 20px', borderRadius: '20px', border: `2px solid ${mode === key ? modeColor : 'var(--border)'}`, cursor: running ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: mode === key ? '600' : '400', background: mode === key ? modeColor : 'transparent', color: mode === key ? '#fff' : 'var(--text-secondary)', opacity: running && mode !== key ? 0.4 : 1 }}>
            {val.label}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px', position: 'relative' }}>
        <svg width="220" height="220" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r={radius} fill="none" stroke="var(--surface-alt)" strokeWidth="12" />
          <circle cx="110" cy="110" r={radius} fill="none" stroke={modeColor} strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={circumference - (progress / 100) * circumference}
            strokeLinecap="round" transform="rotate(-90 110 110)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', fontWeight: '700', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', lineHeight: 1 }}>{mins}:{secs}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>{MODES[mode].label}</div>
        </div>
      </div>

      {/* Task selector */}
      {!running && (
        <div style={{ marginBottom: '24px' }}>
          <select value={selectedTask} onChange={e => setSelectedTask(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}>
            <option value="">No task linked</option>
            {tasks.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
          </select>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
        {!running ? (
          <Button onClick={handleStart} style={{ padding: '12px 40px', fontSize: '16px' }}>Start</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => handleStop('interrupted')} style={{ padding: '12px 32px' }}>Stop</Button>
            <Button onClick={() => handleStop('completed')} style={{ padding: '12px 32px', background: 'var(--success)', border: 'none' }}>Complete</Button>
          </>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>Recent Sessions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {history.map(s => (
              <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '13px' }}>
                <span style={{ color: s.status === 'completed' ? 'var(--success)' : 'var(--text-muted)' }}>{s.status === 'completed' ? '✓' : '✕'}</span>
                <span style={{ flex: 1 }}>{s.taskId?.title || MODES[s.type]?.label}</span>
                <span style={{ color: 'var(--text-muted)' }}>{s.actualMinutes}m</span>
                <span style={{ color: 'var(--text-muted)' }}>{format(new Date(s.startedAt), 'HH:mm')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
