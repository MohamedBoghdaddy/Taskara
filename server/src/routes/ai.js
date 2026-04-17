const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  summarizeNote, extractTasks, rewrite, planToday, answerFromWorkspace,
  meetingToTasks, prioritizeTasks, voiceToTask, dailyBrief, workspaceSummary, commandCenter,
} = require('../controllers/aiController');

router.use(authenticate);

// Existing
router.post('/summarize-note',        summarizeNote);
router.post('/extract-tasks',         extractTasks);
router.post('/rewrite',               rewrite);
router.post('/plan-today',            planToday);
router.post('/answer-from-workspace', answerFromWorkspace);

// New advanced AI
router.post('/meeting-to-tasks',      meetingToTasks);
router.post('/prioritize-tasks',      prioritizeTasks);
router.post('/voice-to-task',         voiceToTask);
router.post('/daily-brief',           dailyBrief);
router.post('/workspace-summary',     workspaceSummary);
router.post('/command-center',        commandCenter);

module.exports = router;
