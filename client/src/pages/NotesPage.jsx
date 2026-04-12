import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getNotes, createNote, deleteNote } from '../api/notes';
import Button from '../components/common/Button';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  NoteFilledIcon, NoteIcon, SearchIcon, AddIcon, DeleteIcon,
  PinIcon, TagIcon, EditIcon, BacklinkIcon, AIIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getNotes({ search, ...filter })
      .then(d => setNotes(d.notes || []))
      .catch(() => toast.error('Failed to load notes'))
      .finally(() => setLoading(false));
  }, [search, filter]);

  const handleCreate = async () => {
    try {
      const note = await createNote({ title: 'Untitled Note', content: '' });
      navigate(`/notes/${note._id}`);
    } catch { toast.error('Failed to create note'); }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this note?')) return;
    try {
      await deleteNote(id);
      setNotes(ns => ns.filter(n => n._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const FILTERS = [
    { label: 'All', key: {} },
    { label: 'Pinned', key: { isPinned: true }, icon: <PinIcon size="xs" /> },
    { label: 'Favorites', key: { isFavorite: true }, icon: <TagIcon size="xs" /> },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Notes</h1>
        <Tooltip content="Create a new note" placement="left">
          <Button onClick={handleCreate}>
            <AddIcon size="sm" style={{ marginRight: '6px' }} /> New Note
          </Button>
        </Tooltip>
      </div>

      <FeatureGuide
        storageKey="notes-page"
        title="Notes"
        icon={<NoteFilledIcon />}
        description="A personal knowledge base for capturing ideas, research, meeting notes, and more. Notes support Markdown and link to each other via backlinks."
        steps={[
          {
            icon: <AddIcon />,
            title: 'Create a note',
            body: 'Click "New Note" to create a blank note and jump straight into the editor.',
          },
          {
            icon: <SearchIcon />,
            title: 'Search notes',
            body: 'Use the search bar to filter notes by title or content in real time.',
          },
          {
            icon: <PinIcon />,
            title: 'Pin important notes',
            body: 'Open a note and pin it to keep it at the top of filtered views for quick access.',
          },
          {
            icon: <EditIcon />,
            title: 'Edit with Markdown',
            body: 'The note editor supports full Markdown — headings, lists, code blocks, and more.',
          },
          {
            icon: <AIIcon />,
            title: 'AI-powered actions',
            body: 'Inside a note use the AI panel to summarize, extract tasks, or rewrite content concisely.',
          },
          {
            icon: <BacklinkIcon />,
            title: 'Backlinks',
            body: 'Reference other notes by title inside content — the editor tracks and shows backlinks automatically.',
          },
        ]}
        tips={[
          'Use the Pinned filter to quickly find notes you reference often',
          'AI "Extract tasks" turns action items in your notes into real tasks',
          'Autosave runs every 800ms — your writing is never lost',
          'Click a note card to open and edit it',
        ]}
        accentColor="#8B5CF6"
      />

      {/* Search */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
          <SearchIcon size="sm" />
        </span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes..."
          style={{ width: '100%', padding: '10px 14px 10px 36px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
        />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {FILTERS.map(f => (
          <button
            key={f.label}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '5px 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: JSON.stringify(filter) === JSON.stringify(f.key) ? 'var(--primary)' : 'var(--surface)',
              color: JSON.stringify(filter) === JSON.stringify(f.key) ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {f.icon}{f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {notes.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              No notes yet.{' '}
              <button onClick={handleCreate} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
                Create your first note →
              </button>
            </div>
          )}
          {notes.map(note => (
            <Link key={note._id} to={`/notes/${note._id}`} style={{ textDecoration: 'none' }}>
              <div
                style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', height: '140px', display: 'flex', flexDirection: 'column', position: 'relative' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {note.isPinned && (
                  <span style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--primary)', fontSize: '12px' }}>
                    <PinIcon size="xs" />
                  </span>
                )}
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '20px' }}>
                  {note.title || 'Untitled'}
                </div>
                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {note.contentText || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Empty note</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{format(new Date(note.updatedAt), 'MMM d')}</span>
                  <Tooltip content="Delete note" placement="left">
                    <button
                      onClick={e => handleDelete(note._id, e)}
                      style={{ fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                    >
                      <DeleteIcon size="xs" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
