import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNote, updateNote, deleteNote, getBacklinks } from '../api/notes';
import { aiSummarize, aiExtractTasks, aiRewrite } from '../api/index';
import { createTask } from '../api/tasks';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  ArrowLeft, SaveIcon, DeleteIcon, AIIcon, BrainIcon, TaskIcon,
  WandIcon, BacklinkIcon, AddIcon, NoteIcon, CheckIcon, SparkIcon,
  BoldIcon, ItalicIcon, StrikeIcon, CodeIcon, QuoteIcon,
  HeadingIcon, BulletIcon, NumberedIcon, CopyIcon, HistoryIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Markdown insertion helper ────────────────────────────────────────────────
function insertMd(textareaRef, before, after = '', newline = false) {
  const ta = textareaRef.current;
  if (!ta) return;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const sel   = ta.value.slice(start, end);
  const prefix = newline && start > 0 && ta.value[start - 1] !== '\n' ? '\n' : '';
  const inserted = prefix + before + sel + after;
  const newVal = ta.value.slice(0, start) + inserted + ta.value.slice(end);
  return { newVal, cursor: start + inserted.length };
}

const FMT_TOOLS = [
  { icon: HeadingIcon,  tip: 'Heading (H2)',  before: '## ',       after: '',   newline: true  },
  { icon: BoldIcon,     tip: 'Bold',          before: '**',        after: '**', newline: false },
  { icon: ItalicIcon,   tip: 'Italic',        before: '_',         after: '_',  newline: false },
  { icon: StrikeIcon,   tip: 'Strikethrough', before: '~~',        after: '~~', newline: false },
  { icon: CodeIcon,     tip: 'Inline code',   before: '`',         after: '`',  newline: false },
  { icon: QuoteIcon,    tip: 'Blockquote',    before: '> ',        after: '',   newline: true  },
  { icon: BulletIcon,   tip: 'Bullet list',   before: '- ',        after: '',   newline: true  },
  { icon: NumberedIcon, tip: 'Numbered list', before: '1. ',       after: '',   newline: true  },
];

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
  const textareaRef = useRef(null);

  useEffect(() => {
    Promise.all([
      getNote(id).then(n => {
        setNote(n);
        setTitle(n.title);
        setContent(typeof n.content === 'string' ? n.content : JSON.stringify(n.content, null, 2));
      }),
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
    setAiLoading(true);
    setAiResult(null);
    setExtractedTasks([]);
    try {
      if (action === 'summarize') {
        const r = await aiSummarize({ noteId: id });
        setAiResult({ type: 'summary', text: r.summary });
      } else if (action === 'extract') {
        const r = await aiExtractTasks({ noteId: id });
        setExtractedTasks(r.tasks || []);
        setAiResult({ type: 'tasks', tasks: r.tasks });
      } else if (action === 'rewrite') {
        const r = await aiRewrite({ noteId: id, content, format: 'concise' });
        setAiResult({ type: 'rewrite', text: r.rewritten });
      }
    } catch (e) { toast.error(e.response?.data?.error || 'AI unavailable'); }
    setAiLoading(false);
  };

  const createExtractedTask = async (task) => {
    try {
      await createTask({ title: task.title, priority: task.priority || 'medium', estimateMinutes: task.estimateMinutes || 0 });
      toast.success(`Task created: ${task.title}`);
      setExtractedTasks(ts => ts.filter(t => t !== task));
    } catch { toast.error('Failed to create task'); }
  };

  const handleFmt = ({ before, after, newline }) => {
    const result = insertMd(textareaRef, before, after, newline);
    if (!result) return;
    setContent(result.newVal);
    scheduleAutosave(title, result.newVal);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = result.cursor;
        textareaRef.current.selectionEnd   = result.cursor;
      }
    }, 0);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => toast.success('Copied to clipboard'));
  };

  if (!note) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Main editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)', flexShrink: 0 }}>
          <Tooltip content="Back to notes" placement="right">
            <button
              onClick={() => navigate('/notes')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '18px' }}
            >
              <ArrowLeft />
            </button>
          </Tooltip>
          <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {saving ? (
              <><SaveIcon size="xs" /> Saving...</>
            ) : (
              `Saved ${format(new Date(note.updatedAt), 'HH:mm')}`
            )}
          </span>
          <FeatureGuide
            storageKey="note-editor-page"
            title="Note Editor"
            icon={<NoteIcon />}
            description="A distraction-free Markdown editor with autosave, AI assistance, and backlink tracking."
            steps={[
              {
                icon: <NoteIcon />,
                title: 'Write in Markdown',
                body: 'Use # headings, **bold**, *italic*, - lists, and ``` code blocks in the editor.',
              },
              {
                icon: <SaveIcon />,
                title: 'Autosave',
                body: 'Your note saves automatically 800ms after you stop typing — no manual save needed.',
              },
              {
                icon: <BrainIcon />,
                title: 'Summarize with AI',
                body: 'Open the AI panel and click "Summarize" to get a concise summary of your note.',
              },
              {
                icon: <TaskIcon />,
                title: 'Extract tasks',
                body: 'AI can detect action items in your note and convert them to real tasks with one click.',
              },
              {
                icon: <WandIcon />,
                title: 'Rewrite with AI',
                body: 'Let AI rewrite your note in a more concise style, then apply the result if you like it.',
              },
              {
                icon: <BacklinkIcon />,
                title: 'Backlinks',
                body: 'Other notes that reference this one appear in the Backlinks panel on the right.',
              },
            ]}
            tips={[
              'Markdown is rendered when you preview; write naturally and freely',
              'Use the AI panel to quickly create tasks from meeting notes',
              'Backlinks help you build a connected knowledge graph over time',
            ]}
            accentColor="#8B5CF6"
          />
          <Tooltip content="Toggle AI panel" placement="bottom">
            <Button size="sm" variant="secondary" onClick={() => setAiPanel(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AIIcon size="sm" /> AI
            </Button>
          </Tooltip>
          <Tooltip content="Delete this note" placement="bottom">
            <Button size="sm" variant="ghost" onClick={handleDelete} style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <DeleteIcon size="sm" /> Delete
            </Button>
          </Tooltip>
        </div>

        {/* Markdown formatting toolbar */}
        <div style={{ padding: '4px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--surface-alt)', flexShrink: 0 }}>
          {FMT_TOOLS.map(({ icon: Icon, tip, before, after, newline }) => (
            <Tooltip key={tip} content={tip} placement="bottom">
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); handleFmt({ before, after, newline }); }}
                style={{ padding: '4px 7px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 'var(--radius)', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Icon size="xs" />
              </button>
            </Tooltip>
          ))}
          <span style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
          <Tooltip content="Copy note content" placement="bottom">
            <button
              type="button"
              onClick={handleCopy}
              style={{ padding: '4px 7px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <CopyIcon size="xs" />
            </button>
          </Tooltip>
          <Tooltip content={`Last saved ${format(new Date(note.updatedAt), 'HH:mm')}`} placement="bottom">
            <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <HistoryIcon size="xs" /> {format(new Date(note.updatedAt), 'HH:mm')}
            </span>
          </Tooltip>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '48px 64px' }}>
          <input
            value={title}
            onChange={handleTitleChange}
            style={{ display: 'block', width: '100%', fontSize: '32px', fontWeight: '700', border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', marginBottom: '24px', lineHeight: 1.2 }}
            placeholder="Untitled"
          />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
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
            <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '10px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SparkIcon size="sm" /> AI Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Button size="sm" variant="secondary" onClick={() => handleAI('summarize')} disabled={aiLoading}>
                Summarize note
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleAI('extract')} disabled={aiLoading}>
                Extract tasks
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleAI('rewrite')} disabled={aiLoading}>
                Rewrite concise
              </Button>
            </div>
            {aiLoading && (
              <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                AI is thinking...
              </div>
            )}
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
                <Button
                  size="sm"
                  style={{ marginTop: '8px', width: '100%' }}
                  onClick={() => { setContent(aiResult.text); setAiResult(null); toast.success('Content replaced'); }}
                >
                  Apply
                </Button>
              </div>
            )}
            {extractedTasks.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', marginBottom: '8px' }}>EXTRACTED TASKS</div>
                {extractedTasks.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', background: 'var(--surface-alt)', borderRadius: 'var(--radius)', marginBottom: '4px', fontSize: '12px' }}>
                    <span style={{ flex: 1, marginRight: '6px' }}>{t.title}</span>
                    <Tooltip content="Create as task" placement="left">
                      <Button size="sm" onClick={() => createExtractedTask(t)}>
                        <AddIcon size="xs" />
                      </Button>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Backlinks */}
        <div style={{ padding: '16px' }}>
          <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BacklinkIcon size="xs" /> Backlinks ({backlinks.length})
          </div>
          {backlinks.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No backlinks yet</div>
          ) : (
            backlinks.map(bl => (
              <a
                key={bl._id}
                href={`/notes/${bl._id}`}
                style={{ display: 'block', padding: '6px 8px', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--primary)', marginBottom: '4px', background: 'var(--surface-alt)', textDecoration: 'none' }}
              >
                <BacklinkIcon size="xs" style={{ marginRight: '4px' }} /> {bl.title}
              </a>
            ))
          )}
        </div>

        {/* Linked tasks */}
        {note.linkedTaskIds?.length > 0 && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TaskIcon size="xs" /> Linked Tasks
            </div>
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
