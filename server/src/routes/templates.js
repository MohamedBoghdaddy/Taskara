const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getTemplates, createTemplate, updateTemplate, deleteTemplate } = require('../controllers/templatesController');

router.use(authenticate);
router.get('/', getTemplates);
router.post('/', createTemplate);
router.patch('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

module.exports = router;
