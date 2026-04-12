const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { search }       = require('../controllers/searchController');
const { semanticSearch, autoCreateBacklinks } = require('../services/search/semanticSearchService');

router.use(authenticate);

// Existing keyword search
router.get('/', search);

// Semantic search (AI-powered)
router.get('/semantic', asyncHandler(async (req, res) => {
  const { q, limit = 20, types } = req.query;
  if (!q) return res.status(400).json({ error: 'q is required' });
  const typeArr = types ? types.split(',') : ['note', 'task', 'project'];
  const result  = await semanticSearch(req.user.defaultWorkspaceId, req.user._id, q, { limit: parseInt(limit), types: typeArr });
  res.json(result);
}));

// Trigger backlink auto-creation
router.post('/auto-backlinks', asyncHandler(async (req, res) => {
  const count = await autoCreateBacklinks(req.user.defaultWorkspaceId);
  res.json({ created: count, message: `Created ${count} new backlinks` });
}));

module.exports = router;
