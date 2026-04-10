import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNote, updateNote, deleteNote, getBacklinks } from '../api/notes';
import { aiSummarize, aiExtractTasks, aiRewrite } from '../api/index';
import { createTask } from '../api/tasks';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function NoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [backlinks, setBacklinks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [aiPanel, setAiPanel] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState([]);
  const saveTimer = useRef(null);

  useEffect(() => {
    Promise.all([
      getNote(id).then(n => { setNote(n); setTitle(n.title); setContent(typeof n.content === 'string' ? n.content : JSON.stringify(n.content, null, 2)); }),
      getBacklinks(id).then(setBacklinks),
    ]).catch(() => toast.error('Failed to load note'));
  }, [id]);

  const scheduleAutosave = useCallback((newTitle, newContent) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try { await updateNote(id, { title: newTitle, content: newContent, contentText: newContent }); }
      catch { toast.error('Autosave failed'); }
      finally { setSaving(false); }
    }, 800);
  }, [id]);

  const handleTitleChange = e => { setTitle(e.target.value); scheduleAutosave(e.target.value, content); };
  const handleContentChange = e => { setContent(e.target.value); scheduleAutosave(title, e.target.value); };

  const handleDelete = async () => {
    if (!window.confirm('Delete this note?')) return;
    try { await deleteNote(id); navigate('/notes'); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const handleAI = async (action) => {
    setAiLoading(true); setAiResult(null); setExtractedTasks([]);
    try {
      if (action === 'summarize') { const r = await aiSummarize({ noteId: id }); setAiResult({ type: 'summary', text: r.summary }); }
      else if (action === 'extract') { const r = await aiExtractTasks({ noteId: id }); setExtractedTasks(r.tasks || []); setAiResult({ type: 'tasks', tasks: r.tasks }); }
      else if (action === 'rewrite') { const r = await aiRewrite({ noteId: id, content, format: 'concise' }); setAiResult({ type: 'rewrite', text: r.rewritten }); }
    } catch (e) { toast.error(e.response?.data?.error || 'AI unavailable'); }
    setAiLoading(false);
  };

  const createExtractedTask = async (task) => {
    try { await createTask({ title: task.title, priority: task.priority || 'medium', estimateMinutes: task.estimateMinutes || 0 }); toast.success(`Task created: ${task.title}`); setExtractedTasks(ts => ts.filter(t => t !== task)); }
    catch { toast.error('Failed to create task'); }
  };

  if (!note) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Main editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)', flexShrink: 0 }}>
          <button onClick={() => navigate('/notes')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>←</button>
          <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-muted)' }}>
            {saving ? '💾 Saving...' : `Saved ${format(new Date(note.updatedAt), 'HH:mm')}`}
          </span>
          <Button size="sm" variant="secondary" onClick={() => setAiPanel(p => !p)}>✨ AI</Button>
          <Button size="sm" variant="ghost" onClick={handleDelete} style={{ color: 'var(--error)' }}>Delete</Button>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '48px 64px' }}>
          <input value={title} onChange={handleTitleChange}
            style={{ display: 'block', width: '100%', fontSize: '32px', fontWeight: '700', border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', marginBottom: '24px', lineHeight: 1.2 }}
            placeholder="Untitled"
          />
          <textarea value={content} onChange={handleContentChange}
            style={{ width: '100%', minHeight: '60vh', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', resize: 'none', lineHeight: 1.7, fontFamily: 'inherit' }}
            placeholder="Start writing... (Markdown supported)"
          />
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: '280px', borderLeft: '1px solid var(--border)', background: 'var(--surface)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* AI panel */}
        {aiPanel && (
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '10px', color: 'var(--primary)' }}>✨ AI Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Button size="sm" variant="secondary" onClick={() => handleAI('summarize')} disabled={aiLoading}>Summarize note</Button>
              <Button size="sm" variant="secondary" onClick={() => handleAI('extract')} disabled={aiLoading}>Extract tasks</Button>
              <Button size="sm" variant="secondary" onClick={() => handleAI('rewrite')} disabled={aiLoading}>Rewrite concise</Button>
            </div>
            {aiLoading && <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>AI is thinking...</div>}
            {aiResult?.type === 'summary' && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'var(--surface-alt)', borderRadius: 'var(--radius)', fontSize: '13px', lineHeight: 1.6, border: '1px solid var(--primary-soft)' }}>
                <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', marginBottom: '6px' }}>AI SUMMARY</div>
                {aiResult.text}
              </div>
            )}
            {aiResult?.type === 'rewrite' && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'var(--surface-alt)', borderRadius: 'var(--radius)', fontSize: '13px', lineHeight: 1.6 }}>
                <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', marginBottom: '6px' }}>AI REWRITE</div>
                {aiResult.text}
                <Button size="sm" style={{ marginTop: '8px', width: '100%' }} onClick={() => { setContent(aiResult.text); setAiResult(null); toast.success('Content replaced'); }}>Apply</Button>
              </div>
            )}
            {extractedTasks.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', marginBottom: '8px' }}>EXTRACTED TASKS</div>
                {extractedTasks.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', background: 'var(--surface-alt)', borderRadius: 'var(--radius)', marginBottom: '4px', fontSize: '12px' }}>
                    <span style={{ flex: 1, marginRight: '6px' }}>{t.title}</span>
                    <Button size="sm" onClick={() => createExtractedTask(t)}>+</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Backlinks */}
        <div style={{ padding: '16px' }}>
          <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '10px', color: 'var(--text-secondary)' }}>Backlinks ({backlinks.length})</div>
          {backlinks.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No backlinks yet</div> :
            backlinks.map(bl => (
              <a key={bl._id} href={`/notes/${bl._id}`} style={{ display: 'block', padding: '6px 8px', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--primary)', marginBottom: '4px', background: 'var(--surface-alt)', textDecoration: 'none' }}>↩ {bl.title}</a>
            ))
          }
        </div>

        {/* Linked tasks */}
        {note.linkedTaskIds?.length > 0 && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '10px', color: 'var(--text-secondary)' }}>Linked Tasks</div>
            {note.linkedTaskIds.map(t => (
              <div key={t._id} style={{ padding: '6px 8px', borderRadius: 'var(--radius)', fontSize: '13px', background: 'var(--surface-alt)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Badge type={t.status} label="" style={{ width: '8px', height: '8px', padding: 0, borderRadius: '50%' }} />
                {t.title}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
