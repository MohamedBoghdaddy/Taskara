const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { register, login, refresh, logout, getMe, updateProfile } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, updateProfile);

module.exports = router;
