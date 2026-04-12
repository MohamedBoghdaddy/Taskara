const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { startSession, stopSession, getHistory, getActive } = require('../controllers/pomodoroController');
const { getAdaptiveRecommendations, predictBestTimes } = require('../services/focus/adaptiveTimerService');

router.use(authenticate);

router.get('/active',    getActive);
router.get('/history',   getHistory);
router.post('/start',    startSession);
router.post('/:id/stop', stopSession);

// Adaptive timer recommendations
router.get('/adaptive', asyncHandler(async (req, res) => {
  const rec = await getAdaptiveRecommendations(req.user._id, req.user.defaultWorkspaceId);
  res.json(rec);
}));

// Best working time predictions
router.get('/best-times', asyncHandler(async (req, res) => {
  const data = await predictBestTimes(req.user._id, req.user.defaultWorkspaceId);
  res.json(data);
}));

module.exports = router;
