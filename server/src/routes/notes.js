const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getNotes, createNote, getNote, updateNote, deleteNote, getBacklinks } = require('../controllers/notesController');

router.use(authenticate);
router.get('/', getNotes);
router.post('/', createNote);
router.get('/:id', getNote);
router.patch('/:id', updateNote);
router.delete('/:id', deleteNote);
router.get('/:id/backlinks', getBacklinks);

module.exports = router;
