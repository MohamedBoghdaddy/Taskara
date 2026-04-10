const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getTasks, createTask, getTask, updateTask, deleteTask, getTodayTasks } = require('../controllers/tasksController');

router.use(authenticate);
router.get('/today', getTodayTasks);
router.get('/', getTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
