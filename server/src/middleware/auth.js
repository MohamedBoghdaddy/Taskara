const jwt = require('jsonwebtoken');
const User = require('../models/User');
const WorkspaceMember = require('../models/WorkspaceMember');
const { isPlatformAdminUser } = require('../utils/platformAdmin');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    user.isPlatformAdmin = isPlatformAdminUser(user);
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireWorkspaceAccess = (minRole = 'viewer') => async (req, res, next) => {
  try {
    if (req.user?.isPlatformAdmin) return next();

    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    if (!workspaceId) return next();

    const roles = ['viewer', 'editor', 'admin', 'owner'];
    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user._id,
    });

    if (!member) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    const memberRoleIndex = roles.indexOf(member.role);
    const minRoleIndex = roles.indexOf(minRole);

    if (memberRoleIndex < minRoleIndex) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    req.workspaceMember = member;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate, requireWorkspaceAccess };
