import React, { useState, useEffect } from 'react';
import { getActivity } from '../api/index';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ACTION_LABELS = { task_created: 'created task', task_updated: 'updated task', task_deleted: 'deleted task', note_created: 'created note', note_deleted: 'deleted note', project_created: 'created project', inbox_item_created: 'captured inbox item', pomodoro_started: 'started focus session', pomodoro_completed: 'completed focus session', daily_note_created: 'created daily note' };

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
      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px' }}>Activity</h1>

      {loading ? <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Loading...</div> : (
        <>
          {logs.length === 0 && <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>No activity yet</div>}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.map((log, i) => {
              const showDate = i === 0 || format(new Date(log.createdAt), 'yyyy-MM-dd') !== format(new Date(logs[i-1].createdAt), 'yyyy-MM-dd');
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
                      <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{ACTION_LABELS[log.action] || log.action}</span>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{format(new Date(log.createdAt), 'HH:mm')}</div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          {total > 30 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px' }}>← Prev</button>
              <span style={{ padding: '6px 10px', fontSize: '13px', color: 'var(--text-secondary)' }}>Page {page}</span>
              <button onClick={() => setPage(p => p+1)} disabled={page * 30 >= total} style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px' }}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
