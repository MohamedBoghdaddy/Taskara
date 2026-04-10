const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { summarizeNote, extractTasks, rewrite, planToday, answerFromWorkspace } = require('../controllers/aiController');

router.use(authenticate);
router.post('/summarize-note', summarizeNote);
router.post('/extract-tasks', extractTasks);
router.post('/rewrite', rewrite);
router.post('/plan-today', planToday);
router.post('/answer-from-workspace', answerFromWorkspace);

module.exports = router;
