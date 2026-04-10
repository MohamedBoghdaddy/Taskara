const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { inviteMember, getMembers, addComment, getComments, getActivity, getDashboardStats, getTaskAnalytics, getFocusAnalytics } = require('../controllers/collaborationController');

router.use(authenticate);
router.post('/workspaces/:workspaceId/invite', inviteMember);
router.get('/workspaces/:workspaceId/members', getMembers);
router.post('/comments', addComment);
router.get('/comments', getComments);
router.get('/activity', getActivity);
router.get('/analytics/dashboard', getDashboardStats);
router.get('/analytics/tasks', getTaskAnalytics);
router.get('/analytics/focus', getFocusAnalytics);

module.exports = router;
