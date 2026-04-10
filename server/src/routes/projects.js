const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getProjects, createProject, getProject, updateProject } = require('../controllers/projectsController');

router.use(authenticate);
router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.patch('/:id', updateProject);

module.exports = router;
