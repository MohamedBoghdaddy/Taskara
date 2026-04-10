const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDailyNote, generateDailyNote } = require('../controllers/dailyNotesController');

router.use(authenticate);
router.get('/:date', getDailyNote);
router.post('/:date/generate', generateDailyNote);

module.exports = router;
