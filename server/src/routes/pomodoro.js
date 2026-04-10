const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { startSession, stopSession, getHistory, getActive } = require('../controllers/pomodoroController');

router.use(authenticate);
router.get('/active', getActive);
router.get('/history', getHistory);
router.post('/start', startSession);
router.post('/:id/stop', stopSession);

module.exports = router;
