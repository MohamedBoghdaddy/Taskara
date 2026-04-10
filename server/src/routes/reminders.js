const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getReminders, createReminder, updateReminder } = require('../controllers/remindersController');

router.use(authenticate);
router.get('/', getReminders);
router.post('/', createReminder);
router.patch('/:id', updateReminder);

module.exports = router;
