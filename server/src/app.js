const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const inboxRoutes = require('./routes/inbox');
const notesRoutes = require('./routes/notes');
const dailyNotesRoutes = require('./routes/dailyNotes');
const tasksRoutes = require('./routes/tasks');
const projectsRoutes = require('./routes/projects');
const pomodoroRoutes = require('./routes/pomodoro');
const searchRoutes = require('./routes/search');
const remindersRoutes = require('./routes/reminders');
const templatesRoutes = require('./routes/templates');
const databasesRoutes = require('./routes/databases');
const collaborationRoutes = require('./routes/collaboration');
const aiRoutes = require('./routes/ai');
const tagsRoutes = require('./routes/tags');
const linksRoutes = require('./routes/links');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use('/api/auth', authRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/daily-notes', dailyNotesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/databases', databasesRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/links', linksRoutes);

app.use(errorHandler);

module.exports = app;
