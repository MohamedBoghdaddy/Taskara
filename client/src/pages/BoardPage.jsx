import React, { useState, useEffect, useRef } from 'react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  BoardIcon, KanbanIcon, AddIcon, EditIcon, DeleteIcon, CloseIcon,
  CheckIcon, PriorityIcon, DueDateIcon, AssignIcon, UsersIcon,
  TaskIcon, RefreshIcon, DragIcon,
} from '../components/common/Icons';

// ── Auth helper ──────────────────────────────────────────────────────────────
const authHeader = () => {
  const s = JSON.parse(localStorage.getItem('auth-store') || '{}');
  return s.state?.token
    ? { Authorization: `Bearer ${s.state.token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
};

const api = async (method, path, body) => {
  const res = await fetch(`/api${path}`, {
    method,
    headers: authHeader(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ── Constants ────────────────────────────────────────────────────────────────
const COLOR_SWATCHES = [
  '#6366F1', '#22C55E', '#F59E0B', '#EF4444',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
];

const PRIORITY_COLORS = {
  low:    'var(--success)',
  medium: 'var(--warning)',
  high:   'var(--error)',
  urgent: '#7C3AED',
};

const PRIORITY_VARIANTS = {
  low: 'success', medium: 'warning', high: 'error', urgent: 'primary',
};

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Done'];

// ── Label helpers ────────────────────────────────────────────────────────────
const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

const fmtDate = iso => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isOverdue = iso => iso && new Date(iso) < new Date();

// ═══════════════════════════════════════════════════════════════════════════
// BoardPage
// ═══════════════════════════════════════════════════════════════════════════
export default function BoardPage() {
  const [boards, setBoards]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeBoard, setActiveBoard] = useState(null);
  const [columns, setColumns]         = useState([]);
  const [cards, setCards]             = useState([]);   // all cards for activeBoard
  const [boardLoading, setBoardLoading] = useState(false);

  // New-board modal
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [boardForm, setBoardForm]       = useState({ name: '', description: '', color: COLOR_SWATCHES[0] });
  const [creating, setCreating]         = useState(false);

  // Add-card inline inputs per column
  const [addingCard, setAddingCard]     = useState(null);   // columnId
  const [newCardTitle, setNewCardTitle] = useState('');

  // Drag state (refs so no re-renders during drag)
  const dragCard       = useRef(null);  // { cardId, fromColumnId }
  const dragOverColumn = useRef(null);

  // ── Load boards ────────────────────────────────────────────────────────
  useEffect(() => { loadBoards(); }, []);

  const loadBoards = async () => {
    setLoading(true);
    try {
      const data = await api('GET', '/boards');
      setBoards(data.boards || data || []);
    } catch {
      // silently handle; show empty state
    } finally {
      setLoading(false);
    }
  };

  // ── Open a board ───────────────────────────────────────────────────────
  const openBoard = async (board) => {
    setActiveBoard(board);
    setBoardLoading(true);
    try {
      const [colData, cardData] = await Promise.all([
        api('GET', `/boards/${board._id}/columns`),
        api('GET', `/boards/${board._id}/cards`),
      ]);
      setColumns(colData.columns || colData || []);
      setCards(cardData.cards || cardData || []);
    } catch {
      // If columns endpoint doesn't exist, use board's embedded data
      setColumns(board.columns || []);
      setCards(board.cards || []);
    } finally {
      setBoardLoading(false);
    }
  };

  // ── Create board ───────────────────────────────────────────────────────
  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!boardForm.name.trim()) return;
    setCreating(true);
    try {
      const payload = {
        name: boardForm.name.trim(),
        description: boardForm.description.trim(),
        color: boardForm.color,
        columns: DEFAULT_COLUMNS.map((title, i) => ({ title, order: i })),
      };
      const created = await api('POST', '/boards', payload);
      const newBoard = created.board || created;
      setBoards(prev => [newBoard, ...prev]);
      setShowNewBoard(false);
      setBoardForm({ name: '', description: '', color: COLOR_SWATCHES[0] });
    } catch {
      // creation failed
    } finally {
      setCreating(false);
    }
  };

  // ── Add card ───────────────────────────────────────────────────────────
  const handleAddCard = async (columnId) => {
    if (!newCardTitle.trim()) { setAddingCard(null); return; }
    try {
      const created = await api('POST', `/boards/${activeBoard._id}/cards`, {
        title: newCardTitle.trim(),
        columnId,
      });
      const newCard = created.card || created;
      setCards(prev => [...prev, newCard]);
    } catch {
      // failed silently
    } finally {
      setNewCardTitle('');
      setAddingCard(null);
    }
  };

  // ── Drag handlers ──────────────────────────────────────────────────────
  const onDragStart = (e, cardId, fromColumnId) => {
    dragCard.current = { cardId, fromColumnId };
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverColumn.current = colId;
  };

  const onDrop = async (e, targetColumnId) => {
    e.preventDefault();
    const { cardId, fromColumnId } = dragCard.current || {};
    if (!cardId || fromColumnId === targetColumnId) return;

    // Optimistic update
    setCards(prev =>
      prev.map(c => c._id === cardId ? { ...c, columnId: targetColumnId } : c)
    );

    try {
      await api('PATCH', `/boards/${activeBoard._id}/cards/${cardId}`, { columnId: targetColumnId });
    } catch {
      // Revert
      setCards(prev =>
        prev.map(c => c._id === cardId ? { ...c, columnId: fromColumnId } : c)
      );
    }
    dragCard.current = null;
  };

  // ── Render: board grid ─────────────────────────────────────────────────
  if (activeBoard) {
    return (
      <BoardView
        board={activeBoard}
        columns={columns}
        cards={cards}
        loading={boardLoading}
        addingCard={addingCard}
        newCardTitle={newCardTitle}
        onBack={() => { setActiveBoard(null); setColumns([]); setCards([]); }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onStartAddCard={(colId) => { setAddingCard(colId); setNewCardTitle(''); }}
        onNewCardTitleChange={setNewCardTitle}
        onAddCard={handleAddCard}
        onCancelAdd={() => { setAddingCard(null); setNewCardTitle(''); }}
      />
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BoardIcon style={{ color: 'var(--primary)', fontSize: '20px' }} />
          <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>Boards</h1>
        </div>
        <Tooltip content="Create a new board" placement="left">
          <Button onClick={() => setShowNewBoard(true)}>
            <AddIcon size="sm" style={{ marginRight: '6px' }} /> New Board
          </Button>
        </Tooltip>
      </div>

      {/* Feature guide */}
      <FeatureGuide
        storageKey="boards"
        title="Boards"
        icon={<KanbanIcon />}
        description="Trello-style boards help you visualize work across customizable columns. Drag cards between columns to track progress at a glance."
        steps={[
          { icon: <AddIcon />,   title: 'Create board',      body: 'Click "New Board", give it a name and pick an accent color.' },
          { icon: <TaskIcon />,  title: 'Add cards',         body: 'Open a board and click "+ Add card" at the bottom of any column.' },
          { icon: <DragIcon />,  title: 'Drag to move',      body: 'Drag any card horizontally into a different column to update its status.' },
          { icon: <UsersIcon />, title: 'Share with team',   body: 'Invite teammates to a board so everyone sees the same view.' },
        ]}
        tips={[
          'Use color accents to distinguish between projects',
          'Keep columns to 5 or fewer for clarity',
          'Assign due dates so overdue cards stand out',
        ]}
        accentColor="var(--primary)"
      />

      {/* Board grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <RefreshIcon style={{ marginRight: '8px' }} /> Loading boards...
        </div>
      ) : boards.length === 0 ? (
        <div style={{
          padding: '64px 32px', textAlign: 'center',
          border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
          color: 'var(--text-muted)',
        }}>
          <BoardIcon style={{ fontSize: '40px', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
          <p style={{ margin: '0 0 16px', fontSize: '15px' }}>No boards yet. Create your first board!</p>
          <Button onClick={() => setShowNewBoard(true)}>
            <AddIcon size="sm" style={{ marginRight: '6px' }} /> New Board
          </Button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {boards.map(board => (
            <BoardCard
              key={board._id}
              board={board}
              onClick={() => openBoard(board)}
            />
          ))}
        </div>
      )}

      {/* New Board Modal */}
      <Modal open={showNewBoard} onClose={() => setShowNewBoard(false)} title="New Board" width="480px">
        <form onSubmit={handleCreateBoard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Board name *</label>
            <input
              required
              autoFocus
              value={boardForm.name}
              onChange={e => setBoardForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Product Roadmap"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={boardForm.description}
              onChange={e => setBoardForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What is this board for?"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Color picker */}
          <div>
            <label style={labelStyle}>Accent color</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLOR_SWATCHES.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setBoardForm(f => ({ ...f, color }))}
                  title={color}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: color, border: 'none', cursor: 'pointer',
                    outline: boardForm.color === color ? `3px solid ${color}` : '3px solid transparent',
                    outlineOffset: '2px',
                    transition: 'outline 0.1s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Default columns info */}
          <div style={{
            fontSize: '12px', color: 'var(--text-muted)',
            padding: '8px 12px', background: 'var(--surface-alt)',
            borderRadius: 'var(--radius)', border: '1px solid var(--border)',
          }}>
            Default columns: <strong>To Do</strong>, <strong>In Progress</strong>, <strong>Done</strong>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowNewBoard(false)}>Cancel</Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Board'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BoardCard (grid item on the home screen)
// ═══════════════════════════════════════════════════════════════════════════
function BoardCard({ board, onClick }) {
  const color = board.color || COLOR_SWATCHES[0];
  const members = board.members?.length ?? board.memberCount ?? 0;
  const taskCount = board.taskCount ?? board.cards?.length ?? 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Color accent bar */}
      <div style={{ height: '6px', background: color }} />

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {board.name}
          </h3>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: color, flexShrink: 0, marginTop: '4px',
          }} />
        </div>

        {board.description && (
          <p style={{
            margin: '0 0 12px', fontSize: '13px',
            color: 'var(--text-secondary)', lineHeight: '1.4',
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {board.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <UsersIcon size="xs" /> {members} {members === 1 ? 'member' : 'members'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TaskIcon size="xs" /> {taskCount} {taskCount === 1 ? 'card' : 'cards'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BoardView (Kanban layout)
// ═══════════════════════════════════════════════════════════════════════════
function BoardView({
  board, columns, cards, loading,
  addingCard, newCardTitle,
  onBack, onDragStart, onDragOver, onDrop,
  onStartAddCard, onNewCardTitleChange, onAddCard, onCancelAdd,
}) {
  const color = board.color || COLOR_SWATCHES[0];
  const [dragOverCol, setDragOverCol] = useState(null);

  const cardsForCol = colId => cards.filter(c => c.columnId === colId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Board header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 24px',
        background: 'var(--surface)',
        borderBottom: `3px solid ${color}`,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 8px', borderRadius: 'var(--radius)' }}
        >
          <KanbanIcon size="sm" style={{ marginRight: '4px' }} /> Boards
        </button>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
          {board.name}
        </h2>
        {board.description && (
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '4px' }}>
            — {board.description}
          </span>
        )}
      </div>

      {/* Columns */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <RefreshIcon style={{ marginRight: '8px' }} /> Loading board...
        </div>
      ) : (
        <div style={{
          flex: 1, display: 'flex', gap: '16px',
          overflowX: 'auto', overflowY: 'hidden',
          padding: '20px 24px',
          alignItems: 'flex-start',
        }}>
          {columns.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '32px' }}>
              No columns found for this board.
            </div>
          )}
          {columns.map(col => (
            <KanbanColumn
              key={col._id}
              col={col}
              cards={cardsForCol(col._id)}
              boardColor={color}
              isOver={dragOverCol === col._id}
              addingCard={addingCard === col._id}
              newCardTitle={newCardTitle}
              onDragStart={onDragStart}
              onDragOver={e => { onDragOver(e, col._id); setDragOverCol(col._id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={e => { onDrop(e, col._id); setDragOverCol(null); }}
              onStartAddCard={() => onStartAddCard(col._id)}
              onNewCardTitleChange={onNewCardTitleChange}
              onAddCard={() => onAddCard(col._id)}
              onCancelAdd={onCancelAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KanbanColumn
// ═══════════════════════════════════════════════════════════════════════════
function KanbanColumn({
  col, cards, boardColor, isOver,
  addingCard, newCardTitle,
  onDragStart, onDragOver, onDragLeave, onDrop,
  onStartAddCard, onNewCardTitleChange, onAddCard, onCancelAdd,
}) {
  const inputRef = useRef(null);
  useEffect(() => { if (addingCard && inputRef.current) inputRef.current.focus(); }, [addingCard]);

  return (
    <div
      style={{
        flex: '0 0 272px', display: 'flex', flexDirection: 'column',
        maxHeight: '100%',
        background: isOver ? 'var(--surface-alt)' : 'var(--surface-alt)',
        border: isOver ? `2px dashed ${boardColor}` : '2px solid transparent',
        borderRadius: 'var(--radius)',
        transition: 'border 0.1s',
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {col.title || col.name}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '1px 7px',
        }}>
          {cards.length}
        </span>
      </div>

      {/* Cards list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {cards.map(card => (
          <KanbanCard
            key={card._id}
            card={card}
            onDragStart={onDragStart}
            colId={col._id}
          />
        ))}

        {/* Inline add-card input */}
        {addingCard && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px' }}>
            <input
              ref={inputRef}
              value={newCardTitle}
              onChange={e => onNewCardTitleChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); onAddCard(); }
                if (e.key === 'Escape') onCancelAdd();
              }}
              placeholder="Card title..."
              style={{ ...inputStyle, marginBottom: '8px' }}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={onAddCard}
                style={{
                  flex: 1, padding: '5px', background: boardColor, color: '#fff',
                  border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                }}
              >
                Add card
              </button>
              <button
                onClick={onCancelAdd}
                style={{ padding: '5px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <CloseIcon size="xs" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add card button */}
      {!addingCard && (
        <button
          onClick={onStartAddCard}
          style={{
            margin: '6px 8px 8px', padding: '6px 10px',
            background: 'none', border: `1px dashed var(--border)`,
            borderRadius: 'var(--radius)', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: '12px',
            display: 'flex', alignItems: 'center', gap: '4px',
            flexShrink: 0,
          }}
        >
          <AddIcon size="xs" /> Add card
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KanbanCard
// ═══════════════════════════════════════════════════════════════════════════
function KanbanCard({ card, onDragStart, colId }) {
  const overdue = isOverdue(card.dueDate);
  const assigneeName = card.assignee?.name || card.assigneeName || '';
  const abbr = initials(assigneeName);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, card._id, colId)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '10px 12px',
        cursor: 'grab',
        fontSize: '13px',
        userSelect: 'none',
        transition: 'box-shadow 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Title */}
      <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.4' }}>
        {card.title}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {card.priority && (
          <Badge
            variant={PRIORITY_VARIANTS[card.priority] || 'default'}
            label={card.priority}
          />
        )}
        {card.dueDate && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            fontSize: '11px',
            color: overdue ? 'var(--error)' : 'var(--text-muted)',
            fontWeight: overdue ? '600' : '400',
          }}>
            <DueDateIcon size="xs" />
            {fmtDate(card.dueDate)}
            {overdue && ' (overdue)'}
          </span>
        )}

        {/* Spacer */}
        <span style={{ flex: 1 }} />

        {/* Assignee avatar */}
        {abbr && (
          <Tooltip content={assigneeName} placement="top">
            <span style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: 'var(--primary)', color: '#fff',
              fontSize: '10px', fontWeight: '700',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {abbr}
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────
const labelStyle = {
  fontSize: '13px', fontWeight: '500',
  color: 'var(--text-secondary)',
  display: 'block', marginBottom: '5px',
};

const inputStyle = {
  width: '100%', padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  fontSize: '14px', outline: 'none',
  boxSizing: 'border-box',
};
