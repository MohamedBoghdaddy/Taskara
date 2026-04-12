import React, { useState, useEffect, useRef } from 'react';
import { getActive, startSession, stopSession, getHistory } from '../api/pomodoro';
import { getTasks } from '../api/tasks';
import Button from '../components/common/Button';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  TimerIcon, PlayIcon, PauseIcon, StopIcon, ResetIcon, BreakIcon,
  FocusIcon, SoundIcon, MuteIcon, TaskIcon, SettingsIcon, SliderIcon,
  CheckCircleIcon, CloseIcon, SkipIcon, FireIcon, StreakIcon, AlarmFilledIcon,
  MusicIcon, MoreIcon,
} from '../components/common/Icons';

const DEFAULT_MODES = {
  focus:       { label: 'Focus',       minutes: 25, color: 'var(--primary)' },
  short_break: { label: 'Short Break', minutes: 5,  color: 'var(--success)' },
  long_break:  { label: 'Long Break',  minutes: 15, color: 'var(--info, #3B82F6)' },
};

const SOUNDS = [
  { id: 'none',    label: 'No sound' },
  { id: 'bell',    label: 'Bell' },
  { id: 'chime',   label: 'Chime' },
  { id: 'digital', label: 'Digital' },
];

const AMBIENT = [
  { id: 'none',   label: 'None' },
  { id: 'rain',   label: 'Rain' },
  { id: 'lofi',   label: 'Lo-fi' },
  { id: 'white',  label: 'White noise' },
  { id: 'forest', label: 'Forest' },
];

export default function PomodoroPage() {
  const [mode, setMode]             = useState('focus');
  const [session, setSession]       = useState(null);
  const [timeLeft, setTimeLeft]     = useState(25 * 60);
  const [running, setRunning]       = useState(false);
  const [tasks, setTasks]           = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [history, setHistory]       = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [sound, setSound]           = useState('bell');
  const [ambient, setAmbient]       = useState('none');
  const [muted, setMuted]           = useState(false);
  const [customMinutes, setCustomMinutes] = useState({ focus: 25, short_break: 5, long_break: 15 });
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const intervalRef = useRef(null);

  const MODES = {
    focus:       { ...DEFAULT_MODES.focus,       minutes: customMinutes.focus },
    short_break: { ...DEFAULT_MODES.short_break, minutes: customMinutes.short_break },
    long_break:  { ...DEFAULT_MODES.long_break,  minutes: customMinutes.long_break },
  };

  useEffect(() => {
    getTasks({ status: 'in_progress' }).then(d => setTasks(d.tasks || []));
    getHistory({ limit: 10 }).then(d => setHistory(d.sessions || []));
    getActive().then(s => {
      if (s) { setSession(s); setRunning(true); setMode(s.type); }
    });
  }, []);

  useEffect(() => {
    if (running && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && running) {
      handleStop('completed');
      if (!muted && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`${MODES[mode].label} complete!`, { body: 'Time for a break!' });
      }
      if (mode === 'focus') {
        setPomodoroCount(c => c + 1);
        toast.success(`Focus session complete! ${pomodoroCount + 1} pomodoros today.`);
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [running, timeLeft]);

  useEffect(() => {
    if (!running) setTimeLeft(MODES[mode].minutes * 60);
  }, [mode, running, customMinutes]);

  const handleStart = async () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    try {
      const s = await startSession({ type: mode, plannedMinutes: MODES[mode].minutes, taskId: selectedTask || undefined });
      setSession(s); setRunning(true);
      toast.success(`${MODES[mode].label} started`);
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to start session'); }
  };

  const handleStop = async (status = 'interrupted') => {
    if (!session) { setRunning(false); return; }
    try {
      const s = await stopSession(session._id, { status });
      setRunning(false); setSession(null);
      setHistory(prev => [s, ...prev.slice(0, 9)]);
      if (status === 'completed') toast.success('Session complete!');
      else toast('Session stopped');
    } catch { toast.error('Failed to stop session'); }
  };

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  const totalSecs = MODES[mode].minutes * 60;
  const progress = ((totalSecs - timeLeft) / totalSecs) * 100;
  const modeColor = MODES[mode].color;
  const radius = 88;
  const circumference = 2 * Math.PI * radius;

  const completedToday = history.filter(s => s.status === 'completed' && s.type === 'focus').length;

  return (
    <div style={{ padding: '28px', maxWidth: '720px', margin: '0 auto' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <TimerIcon style={{ fontSize: '20px', color: 'var(--primary)' }} />
        <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>Focus Timer</h1>
        <Tooltip content="Timer settings">
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 'var(--radius)' }}
          >
            <SliderIcon />
          </button>
        </Tooltip>
        <Tooltip content={muted ? 'Unmute' : 'Mute'}>
          <button
            onClick={() => setMuted(m => !m)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted ? 'var(--error)' : 'var(--text-muted)', padding: '4px 6px', borderRadius: 'var(--radius)' }}
          >
            {muted ? <MuteIcon /> : <SoundIcon />}
          </button>
        </Tooltip>
      </div>

      <FeatureGuide
        storageKey="pomodoro"
        title="Focus Timer"
        icon={<TimerIcon />}
        accentColor="var(--primary)"
        description="The Pomodoro Technique breaks work into focused intervals separated by short breaks, helping you maintain concentration and avoid burnout."
        steps={[
          { icon: <TaskIcon size="xs" />, title: 'Link a task', body: 'Select a task from the dropdown — focus time is tracked against it.' },
          { icon: <PlayIcon size="xs" />, title: 'Start Focus (25 min)', body: 'Click Start to begin a work session. The ring counts down.' },
          { icon: <BreakIcon size="xs" />, title: 'Take a break', body: 'After the session ends, switch to Short Break (5 min). Every 4 pomodoros, take a Long Break.' },
          { icon: <AlarmFilledIcon size="xs" />, title: 'Get notified', body: 'Browser notifications fire when a session ends — allow them for best experience.' },
        ]}
        tips={[
          'Use Ctrl+B to collapse sidebar for distraction-free focus',
          'Long Break after every 4 focus sessions',
          'Customize durations in Settings (⚙)',
          'Sessions are saved for analytics',
        ]}
      />

      {/* Settings panel */}
      {showSettings && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <SliderIcon style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: '600', fontSize: '14px' }}>Timer Settings</span>
            <button onClick={() => setShowSettings(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <CloseIcon size="xs" />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
            {[['focus', 'Focus'], ['short_break', 'Short Break'], ['long_break', 'Long Break']].map(([key, lbl]) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {lbl} (min)
                <input
                  type="number" min="1" max="120" value={customMinutes[key]}
                  onChange={e => !running && setCustomMinutes(p => ({ ...p, [key]: +e.target.value }))}
                  disabled={running}
                  style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface-alt)', color: 'var(--text-primary)', fontSize: '13px', width: '100%' }}
                />
              </label>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span><AlarmFilledIcon size="xs" /> Alarm sound</span>
              <select value={sound} onChange={e => setSound(e.target.value)} style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface-alt)', color: 'var(--text-primary)', fontSize: '13px' }}>
                {SOUNDS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span><MusicIcon size="xs" /> Ambient sound</span>
              <select value={ambient} onChange={e => setAmbient(e.target.value)} style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface-alt)', color: 'var(--text-primary)', fontSize: '13px' }}>
                {AMBIENT.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </label>
          </div>
        </div>
      )}

      {/* Mode selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
        {Object.entries(MODES).map(([key, val]) => (
          <button key={key} onClick={() => !running && setMode(key)} style={{
            padding: '7px 18px', borderRadius: '20px',
            border: `2px solid ${mode === key ? val.color : 'var(--border)'}`,
            cursor: running ? 'not-allowed' : 'pointer', fontSize: '13px',
            fontWeight: mode === key ? '600' : '400',
            background: mode === key ? val.color : 'transparent',
            color: mode === key ? '#fff' : 'var(--text-secondary)',
            opacity: running && mode !== key ? 0.4 : 1,
            transition: 'all 150ms',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {key === 'focus' ? <FocusIcon size="xs" /> : <BreakIcon size="xs" />}
            {val.label}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px', position: 'relative' }}>
        <svg width="220" height="220" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r={radius} fill="none" stroke="var(--surface-alt)" strokeWidth="12" />
          <circle cx="110" cy="110" r={radius} fill="none" stroke={modeColor} strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={circumference - (progress / 100) * circumference}
            strokeLinecap="round" transform="rotate(-90 110 110)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <div style={{ fontSize: '46px', fontWeight: '700', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', lineHeight: 1 }}>
            {mins}:{secs}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            {mode === 'focus' ? <FocusIcon size="xs" /> : <BreakIcon size="xs" />}
            {MODES[mode].label}
          </div>
          {pomodoroCount > 0 && (
            <div style={{ fontSize: '11px', color: modeColor, marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
              <FireIcon size="xs" /> {pomodoroCount} today
            </div>
          )}
        </div>
      </div>

      {/* Task selector */}
      {!running && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
            <TaskIcon size="xs" /> Link to a task (optional)
          </label>
          <select value={selectedTask} onChange={e => setSelectedTask(e.target.value)} style={{
            width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', background: 'var(--surface-alt)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
          }}>
            <option value="">No task linked</option>
            {tasks.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
          </select>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
        {!running ? (
          <Button onClick={handleStart} style={{ padding: '11px 44px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlayIcon size="xs" /> Start
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => handleStop('interrupted')} style={{ padding: '11px 28px', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <StopIcon size="xs" /> Stop
            </Button>
            <Button onClick={() => handleStop('completed')} style={{ padding: '11px 28px', background: 'var(--success)', border: 'none', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <CheckCircleIcon size="xs" /> Complete
            </Button>
          </>
        )}
      </div>

      {/* Session history */}
      {history.length > 0 && (
        <div style={{ marginTop: '36px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TimerIcon size="xs" /> Recent Sessions
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400' }}>
              {completedToday} completed today
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {history.map(s => (
              <div key={s._id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', fontSize: '12px',
              }}>
                <span style={{ color: s.status === 'completed' ? 'var(--success)' : 'var(--text-muted)' }}>
                  {s.status === 'completed' ? <CheckCircleIcon size="xs" /> : <CloseIcon size="xs" />}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.taskId?.title || MODES[s.type]?.label || s.type}
                </span>
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
