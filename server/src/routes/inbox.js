const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getItems, getUnreadCount, createItem, updateItem, convertItem } = require('../controllers/inboxController');

router.use(authenticate);
router.get('/unread-count', getUnreadCount);
router.get('/', getItems);
router.post('/', createItem);
router.patch('/:id', updateItem);
router.post('/:id/convert', convertItem);

module.exports = router;
