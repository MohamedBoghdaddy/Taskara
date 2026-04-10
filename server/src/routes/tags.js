const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getTags, createTag, updateTag, deleteTag } = require('../controllers/tagsController');

router.use(authenticate);
router.get('/', getTags);
router.post('/', createTag);
router.patch('/:id', updateTag);
router.delete('/:id', deleteTag);

module.exports = router;
