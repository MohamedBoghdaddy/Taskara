const express = require('express');
const router  = express.Router();
const Board   = require('../models/Board');
const { authenticate } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const guard = (fn) => async (req, res, next) => {
  try { await fn(req, res, next); } catch (e) { next(e); }
};

// GET /boards — list workspace boards
router.get('/', authenticate, guard(async (req, res) => {
  const wid = req.user.defaultWorkspaceId;
  const boards = await Board.find({ workspaceId: wid, isArchived: false })
    .select('name description color icon columns members createdAt')
    .populate('members', 'firstName lastName avatar')
    .sort('-updatedAt');
  res.json({ boards });
}));

// POST /boards — create board
router.post('/', authenticate, guard(async (req, res) => {
  const { name, description, color, icon, projectId } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const board = await Board.create({
    name, description, color: color || '#6366F1', icon,
    workspaceId: req.user.defaultWorkspaceId,
    createdBy: req.user._id,
    members: [req.user._id],
    projectId: projectId || null,
  });
  res.status(201).json(board);
}));

// GET /boards/:id — full board with cards
router.get('/:id', authenticate, guard(async (req, res) => {
  const board = await Board.findById(req.params.id)
    .populate('members', 'firstName lastName avatar email')
    .populate('cards.assignees', 'firstName lastName avatar')
    .populate('cards.createdBy', 'firstName lastName');
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
}));

// PATCH /boards/:id — update board meta
router.patch('/:id', authenticate, guard(async (req, res) => {
  const board = await Board.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(board);
}));

// DELETE /boards/:id — archive board
router.delete('/:id', authenticate, guard(async (req, res) => {
  await Board.findByIdAndUpdate(req.params.id, { isArchived: true });
  res.json({ success: true });
}));

// ── Columns ────────────────────────────────────────────────────────────────

// POST /boards/:id/columns — add column
router.post('/:id/columns', authenticate, guard(async (req, res) => {
  const { title, color, limit } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const board = await Board.findById(req.params.id);
  const col = { id: uuid(), title, color, limit, order: board.columns.length };
  board.columns.push(col);
  await board.save();
  // Emit via socket if available
  if (req.app.get('io')) req.app.get('io').to(`board:${req.params.id}`).emit('column:added', col);
  res.status(201).json(board.columns);
}));

// PATCH /boards/:id/columns/:colId — rename / reorder column
router.patch('/:id/columns/:colId', authenticate, guard(async (req, res) => {
  const board = await Board.findById(req.params.id);
  const col = board.columns.find(c => c.id === req.params.colId);
  if (!col) return res.status(404).json({ error: 'Column not found' });
  Object.assign(col, req.body);
  await board.save();
  res.json(board.columns);
}));

// DELETE /boards/:id/columns/:colId — remove column (moves cards to first column)
router.delete('/:id/columns/:colId', authenticate, guard(async (req, res) => {
  const board = await Board.findById(req.params.id);
  const colId = req.params.colId;
  const fallback = board.columns.find(c => c.id !== colId)?.id;
  board.cards.forEach(c => { if (c.columnId === colId) c.columnId = fallback || 'todo'; });
  board.columns = board.columns.filter(c => c.id !== colId);
  await board.save();
  res.json(board.columns);
}));

// ── Cards ─────────────────────────────────────────────────────────────────

// POST /boards/:id/cards — create card
router.post('/:id/cards', authenticate, guard(async (req, res) => {
  const { title, columnId, description, priority, dueDate, assignees, labels } = req.body;
  if (!title || !columnId) return res.status(400).json({ error: 'title and columnId required' });
  const board = await Board.findById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const cardsInCol = board.cards.filter(c => c.columnId === columnId).length;
  const card = {
    title, columnId, description: description || '', priority: priority || 'medium',
    dueDate, assignees: assignees || [], labels: labels || [],
    createdBy: req.user._id, order: cardsInCol,
  };
  board.cards.push(card);
  await board.save();
  const newCard = board.cards[board.cards.length - 1];
  if (req.app.get('io')) req.app.get('io').to(`board:${req.params.id}`).emit('card:added', newCard);
  res.status(201).json(newCard);
}));

// PATCH /boards/:id/cards/:cardId — update card (move, edit)
router.patch('/:id/cards/:cardId', authenticate, guard(async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const card = board.cards.id(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  Object.assign(card, req.body);
  await board.save();
  if (req.app.get('io')) req.app.get('io').to(`board:${req.params.id}`).emit('card:updated', card);
  res.json(card);
}));

// DELETE /boards/:id/cards/:cardId
router.delete('/:id/cards/:cardId', authenticate, guard(async (req, res) => {
  const board = await Board.findById(req.params.id);
  const card  = board.cards.id(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  card.deleteOne();
  await board.save();
  if (req.app.get('io')) req.app.get('io').to(`board:${req.params.id}`).emit('card:deleted', req.params.cardId);
  res.json({ success: true });
}));

// POST /boards/:id/cards/:cardId/checklist — add checklist item
router.post('/:id/cards/:cardId/checklist', authenticate, guard(async (req, res) => {
  const board = await Board.findById(req.params.id);
  const card  = board.cards.id(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  card.checklist.push({ text: req.body.text, done: false });
  await board.save();
  res.json(card);
}));

// PATCH /boards/:id/cards/:cardId/checklist/:itemId — toggle checklist item
router.patch('/:id/cards/:cardId/checklist/:itemId', authenticate, guard(async (req, res) => {
  const board = await Board.findById(req.params.id);
  const card  = board.cards.id(req.params.cardId);
  const item  = card?.checklist.id(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  item.done = !item.done;
  await board.save();
  res.json(card);
}));

// POST /boards/:id/members — add member
router.post('/:id/members', authenticate, guard(async (req, res) => {
  const board = await Board.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { members: req.body.userId } },
    { new: true }
  ).populate('members', 'firstName lastName avatar email');
  res.json(board.members);
}));

module.exports = router;
