import React, { useState, useEffect } from 'react';
import { getActivity } from '../api/index';
import { format } from 'date-fns';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  TeamIcon,
  UserPlusIcon,
  UsersIcon,
  ShieldIcon,
  EyeIcon,
  EditIcon,
  CheckCircleIcon,
  ChevronLeft,
  ChevronRight,
  TaskIcon,
  NoteIcon,
  ProjectIcon,
  TimerIcon,
  InboxIcon,
  TodayIcon,
  LoadingIcon,
  CommentIcon,
  MentionIcon,
  InviteIcon,
  EmailIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

const ACTION_LABELS = {
  task_created: 'created task',
  task_updated: 'updated task',
  task_deleted: 'deleted task',
  note_created: 'created note',
  note_deleted: 'deleted note',
  project_created: 'created project',
  inbox_item_created: 'captured inbox item',
  pomodoro_started: 'started focus session',
  pomodoro_completed: 'completed focus session',
  daily_note_created: 'created daily note',
};

const ACTION_ICONS = {
  task_created:        <TaskIcon />,
  task_updated:        <EditIcon />,
  task_deleted:        <TaskIcon />,
  note_created:        <NoteIcon />,
  note_deleted:        <NoteIcon />,
  note_updated:        <NoteIcon />,
  project_created:     <ProjectIcon />,
  inbox_item_created:  <InboxIcon />,
  pomodoro_started:    <TimerIcon />,
  pomodoro_completed:  <CheckCircleIcon />,
  daily_note_created:  <TodayIcon />,
  member_invited:      <InviteIcon />,
  member_joined:       <UserPlusIcon />,
  comment_added:       <CommentIcon />,
  mention:             <MentionIcon />,
  email_sent:          <EmailIcon />,
};

export default function CollaborationPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    getActivity({ page, limit: 30 })
      .then(d => { setLogs(d.logs || []); setTotal(d.total || 0); })
      .catch(() => toast.error('Failed to load activity'))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <FeatureGuide
        storageKey="collaboration-guide"
        title="Activity & Collaboration"
        icon={<TeamIcon />}
        description="The Activity feed shows a chronological log of everything that happens in your workspace — tasks, notes, projects, focus sessions, and more."
        steps={[
          {
            icon: <UsersIcon />,
            title: 'Activity feed',
            body: 'Every action by any workspace member is logged here with their avatar, action, and timestamp.',
          },
          {
            icon: <ShieldIcon />,
            title: 'Role differences',
            body: 'Admins can manage members and settings. Editors can create and edit content. Viewers can only read.',
          },
          {
            icon: <UserPlusIcon />,
            title: 'Inviting members',
            body: 'Use the workspace settings to invite members by email. They receive a role on joining.',
          },
          {
            icon: <EyeIcon />,
            title: 'Viewer role',
            body: 'Viewers see all content but cannot create, edit, or delete anything in the workspace.',
          },
          {
            icon: <EditIcon />,
            title: 'Editor role',
            body: 'Editors can create and modify tasks, notes, and projects but cannot manage members.',
          },
          {
            icon: <CheckCircleIcon />,
            title: 'Admin role',
            body: 'Admins have full control: manage members, update roles, and delete workspace content.',
          },
        ]}
        tips={[
          'Activity is paginated — use the Prev/Next buttons to browse older entries',
          'Date headers group entries by day for easy scanning',
          'Assign the viewer role to stakeholders who only need read access',
        ]}
        accentColor="var(--primary)"
      />

      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TeamIcon /> Activity
      </h1>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <LoadingIcon /> Loading activity…
        </div>
      ) : (
        <>
          {logs.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              No activity yet
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.map((log, i) => {
              const showDate = i === 0 || format(new Date(log.createdAt), 'yyyy-MM-dd') !== format(new Date(logs[i - 1].createdAt), 'yyyy-MM-dd');
              return (
                <React.Fragment key={log._id}>
                  {showDate && (
                    <div style={{ padding: '8px 0', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginTop: i > 0 ? '12px' : 0 }}>
                      {format(new Date(log.createdAt), 'MMMM d, yyyy')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
                      {log.userId?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>{log.userId?.name || 'User'}</span>
                      {' '}
                      <span style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {ACTION_ICONS[log.action] || <TeamIcon size="xs" />}
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {format(new Date(log.createdAt), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          {total > 30 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', alignItems: 'center' }}>
              <Tooltip content="Previous page" placement="top">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronLeft size="xs" /> Prev
                </button>
              </Tooltip>
              <span style={{ padding: '6px 10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Page {page}
              </span>
              <Tooltip content="Next page" placement="top">
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 30 >= total}
                  style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Next <ChevronRight size="xs" />
                </button>
              </Tooltip>
            </div>
          )}
        </>
      )}
    </div>
  );
}
