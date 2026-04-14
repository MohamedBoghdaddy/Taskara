import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as sprintApi from '../api/sprints';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Input from '../components/common/Input';
import FeatureGuide from '../components/common/FeatureGuide';
import {
  SprintIcon, AddIcon, TrophyIcon, TimerIcon, CheckCircleIcon,
  CalendarIcon, PriorityFilledIcon, FlashIcon, PlayIcon, CheckIcon, CloseIcon,
} from '../components/common/Icons';

const STATUS_COLOR = { planning: 'var(--text-muted)', active: 'var(--success)', completed: 'var(--primary)' };
const STATUS_BG    = { planning: 'var(--surface-alt)', active: '#16a34a22', completed: 'var(--primary)22' };

export default function SprintsPage() {
  const navigate = useNavigate();
  const [sprints, setSprints]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState({ name: '', goal: '', startDate: '', endDate: '' });
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    sprintApi.getSprints()
      .then(d => setSprints(d.sprints || []))
      .catch(() => toast.error('Failed to load sprints'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Sprint name required');
    setSaving(true);
    try {
      await sprintApi.createSprint(form);
      toast.success('Sprint created');
      setShowModal(false);
      setForm({ name: '', goal: '', startDate: '', endDate: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create sprint');
    } finally { setSaving(false); }
  };

  const handleStart = async (sprint) => {
    try {
      await sprintApi.updateSprint(sprint._id, { status: 'active' });
      toast.success(`Sprint "${sprint.name}" started!`);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to start sprint'); }
  };

  const handleComplete = async (sprint) => {
    if (!window.confirm(`Complete sprint "${sprint.name}"? Unfinished tasks will return to backlog.`)) return;
    try {
      await sprintApi.updateSprint(sprint._id, { status: 'completed' });
      toast.success('Sprint completed!');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to complete sprint'); }
  };

  const handleDelete = async (sprint) => {
    if (!window.confirm(`Delete sprint "${sprint.name}"?`)) return;
    try {
      await sprintApi.deleteSprint(sprint._id);
      toast.success('Sprint deleted');
      load();
    } catch (err) { toast.error('Failed to delete sprint'); }
  };

  const active    = sprints.filter(s => s.status === 'active');
  const planning  = sprints.filter(s => s.status === 'planning');
  const completed = sprints.filter(s => s.status === 'completed');

  const SprintCard = ({ sprint }) => {
    const tasks    = sprint.tasks || [];
    const done     = tasks.filter(t => t.status === 'done').length;
    const total    = tasks.length;
    const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
    const daysLeft = sprint.endDate ? Math.ceil((new Date(sprint.endDate) - new Date()) / 86400000) : null;

    return (
      <div
        style={{
          background: 'var(--surface)', border: `1px solid var(--border)`,
          borderRadius: 'var(--radius)', padding: '16px',
          cursor: 'pointer', transition: 'box-shadow 0.15s',
          borderLeft: `4px solid ${STATUS_COLOR[sprint.status] || 'var(--border)'}`,
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        onClick={() => navigate(`/sprints/${sprint._id}`)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' }}>{sprint.name}</span>
              <Badge
                label={sprint.status}
                variant={sprint.status === 'active' ? 'success' : sprint.status === 'completed' ? 'primary' : 'default'}
                style={{ fontSize: '10px', textTransform: 'capitalize' }}
              />
            </div>
            {sprint.goal && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{sprint.goal}</p>}
          </div>
          <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
            {sprint.status === 'planning' && (
              <Button size="sm" variant="primary" onClick={() => handleStart(sprint)}>
                <PlayIcon size="xs" /> Start
              </Button>
            )}
            {sprint.status === 'active' && (
              <Button size="sm" variant="secondary" onClick={() => handleComplete(sprint)}>
                <CheckIcon size="xs" /> Complete
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={() => handleDelete(sprint)}>
              <CloseIcon size="xs" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              <span>{done}/{total} tasks done</span>
              <span>{pct}%</span>
            </div>
            <div style={{ background: 'var(--surface-alt)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: sprint.status === 'completed' ? 'var(--primary)' : 'var(--success)',
                width: `${pct}%`, transition: 'width 0.3s', borderRadius: '4px',
              }} />
            </div>
          </div>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          {sprint.startDate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CalendarIcon size="xs" /> {new Date(sprint.startDate).toLocaleDateString()}
            </span>
          )}
          {sprint.endDate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <PriorityFilledIcon size="xs" /> {new Date(sprint.endDate).toLocaleDateString()}
            </span>
          )}
          {daysLeft !== null && sprint.status === 'active' && (
            <span style={{ color: daysLeft < 0 ? 'var(--error)' : daysLeft <= 2 ? '#f59e0b' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TimerIcon size="xs" />
              {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft} days left`}
            </span>
          )}
          {sprint.velocity > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FlashIcon size="xs" /> {sprint.velocity} pts velocity
            </span>
          )}
        </div>
      </div>
    );
  };

  const Section = ({ icon, title, items, empty }) => (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {icon} {title} <span style={{ fontWeight: '400', opacity: 0.7 }}>({items.length})</span>
      </h2>
      {items.length === 0
        ? <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>{empty}</p>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{items.map(s => <SprintCard key={s._id} sprint={s} />)}</div>
      }
    </div>
  );

  return (
    <div style={{ padding: '32px', maxWidth: '860px' }}>
      {/* How to use guide */}
      <FeatureGuide
        storageKey="sprints-guide"
        title="Sprints"
        icon={<SprintIcon />}
        description="Organize your work into time-boxed sprints (Scrum-style). Plan tasks in the backlog, start a sprint, track progress with a burndown chart, then complete it."
        steps={[
          { icon: <AddIcon />, title: 'Create a sprint', body: 'Click "New Sprint", set a name, goal, and date range.' },
          { icon: <PlayIcon />, title: 'Start the sprint', body: 'Move from Planning → Active to begin the time box.' },
          { icon: <SprintIcon />, title: 'Add tasks', body: 'Go to Backlog and drag tasks into the active sprint.' },
          { icon: <CheckCircleIcon />, title: 'Complete', body: 'When done, click Complete — velocity is auto-calculated.' },
        ]}
        tips={[
          'Keep sprints 1–2 weeks long',
          'Set a clear sprint goal before starting',
          'Review velocity to improve future estimates',
          'Unfinished tasks auto-return to backlog on completion',
        ]}
        accentColor="var(--success)"
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SprintIcon color="var(--primary)" /> Sprints
        </h1>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <AddIcon /> New Sprint
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Loading sprints…</div>
      ) : (
        <>
          <Section
            icon={<SprintIcon color="var(--success)" size="sm" />}
            title="Active"
            items={active}
            empty="No active sprint. Start one from the Planning section below."
          />
          <Section
            icon={<CalendarIcon size="sm" color="var(--primary)" />}
            title="Planning"
            items={planning}
            empty="No sprints in planning. Create one to get started."
          />
          <Section
            icon={<TrophyIcon size="sm" color="var(--primary)" />}
            title="Completed"
            items={completed}
            empty="No completed sprints yet."
          />
        </>
      )}

      {/* Create sprint modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Sprint">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Sprint name *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Sprint 1 — MVP Launch"
            required
          />
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Goal</label>
            <textarea
              value={form.goal}
              onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
              placeholder="What should be achieved in this sprint?"
              rows={3}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Start date" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            <Input label="End date"   type="date" value={form.endDate}   onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Creating…' : 'Create Sprint'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
