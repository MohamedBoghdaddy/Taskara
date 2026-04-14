const Note = require('../../models/Note');
const Task = require('../../models/Task');
const Project = require('../../models/Project');

const APP_DESTINATIONS = [
  { title: 'Today', path: '/today', description: 'Open your focus and planning dashboard.', keywords: ['today', 'dashboard', 'home', 'plan'] },
  { title: 'Inbox', path: '/inbox', description: 'Capture and process incoming ideas and tasks.', keywords: ['inbox', 'capture', 'triage'] },
  { title: 'Notes', path: '/notes', description: 'Browse and edit notes.', keywords: ['notes', 'note', 'docs', 'writing'] },
  { title: 'Daily Notes', path: '/daily/today', description: 'Open the journal page for today.', keywords: ['daily', 'journal', 'log', 'today note'] },
  { title: 'Tasks', path: '/tasks', description: 'See all tasks in one place.', keywords: ['tasks', 'task', 'todo', 'todos'] },
  { title: 'Boards', path: '/boards', description: 'Manage work visually on kanban boards.', keywords: ['boards', 'board', 'kanban'] },
  { title: 'Backlog', path: '/backlog', description: 'Plan upcoming work and sprints.', keywords: ['backlog', 'sprint planning', 'sprints'] },
  { title: 'Sprints', path: '/sprints', description: 'Track sprint progress.', keywords: ['sprint', 'sprints', 'scrum'] },
  { title: 'Projects', path: '/projects', description: 'Browse active projects.', keywords: ['projects', 'project'] },
  { title: 'Pomodoro', path: '/pomodoro', description: 'Start a focus timer session.', keywords: ['pomodoro', 'focus', 'timer', 'pause'] },
  { title: 'Calendar', path: '/calendar', description: 'View work by date.', keywords: ['calendar', 'schedule', 'dates'] },
  { title: 'Analytics', path: '/analytics', description: 'See productivity trends and reports.', keywords: ['analytics', 'reports', 'insights', 'stats'] },
  { title: 'Search', path: '/search', description: 'Open the full search experience.', keywords: ['search', 'find', 'lookup'] },
  { title: 'Templates', path: '/templates', description: 'Manage reusable templates.', keywords: ['templates', 'template'] },
  { title: 'Databases', path: '/databases', description: 'Work with structured databases.', keywords: ['databases', 'database', 'records'] },
  { title: 'Graph', path: '/graph', description: 'Explore your connected knowledge graph.', keywords: ['graph', 'backlinks', 'links'] },
  { title: 'Canvas', path: '/canvas', description: 'Sketch and organize ideas visually.', keywords: ['canvas', 'whiteboard', 'diagram'] },
  { title: 'AI Assistant', path: '/ai', description: 'Ask questions and plan with AI.', keywords: ['ai', 'assistant', 'chat', 'workspace qa'] },
  { title: 'Collaboration', path: '/collaboration', description: 'Manage workspace members and roles.', keywords: ['team', 'collaboration', 'members', 'roles'] },
  { title: 'Automations', path: '/automations', description: 'Create rules and automated workflows.', keywords: ['automations', 'automation', 'rules'] },
  { title: 'Webhooks', path: '/webhooks', description: 'Manage outgoing webhook integrations.', keywords: ['webhooks', 'webhook'] },
  { title: 'Integrations', path: '/integrations', description: 'Connect Slack, Todoist, and more.', keywords: ['integrations', 'integration', 'slack', 'todoist'] },
  { title: 'Settings', path: '/settings', description: 'Update profile and workspace preferences.', keywords: ['settings', 'preferences', 'profile'] },
  { title: 'Pricing', path: '/pricing', description: 'Review plans and upgrades.', keywords: ['pricing', 'plans', 'billing', 'upgrade'] },
];

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const scoreText = (query, text = '') => {
  const q = query.trim().toLowerCase();
  const source = text.toLowerCase().trim();
  if (!q || !source) return 0;
  if (source === q) return 10;
  if (source.startsWith(q)) return 8;

  const sourceTokens = source.split(/[^a-z0-9]+/).filter(Boolean);
  const queryTokens = q.split(/[^a-z0-9]+/).filter(Boolean);

  return queryTokens.reduce((score, token) => {
    if (sourceTokens.includes(token)) return score + 6;
    if (sourceTokens.some(sourceToken => sourceToken.startsWith(token))) return score + 4;
    return score;
  }, 0);
};

const getPageResults = (query) => {
  const normalized = query.trim().toLowerCase();
  return APP_DESTINATIONS
    .map((page) => {
      const score = Math.max(
        scoreText(normalized, page.title),
        ...page.keywords.map(keyword => scoreText(normalized, keyword))
      );

      if (score <= 0) return null;

      return {
        type: 'page',
        item: {
          title: page.title,
          description: page.description,
          path: page.path,
        },
        score: score + 2,
      };
    })
    .filter(Boolean);
};

const globalSearch = async (workspaceId, userId, { q, type, tags, projectId, page = 1, limit = 20 }) => {
  if (!q || q.trim().length < 1) return { results: [], total: 0, page: 1, limit: toNumber(limit, 20) };

  const normalizedQuery = q.trim();
  const normalizedType = type?.trim();
  const safeRegex = new RegExp(escapeRegExp(normalizedQuery), 'i');
  const pageNumber = toNumber(page, 1);
  const pageSize = toNumber(limit, 20);
  const results = normalizedType && normalizedType !== 'page' ? [] : getPageResults(normalizedQuery);
  const dbLimit = Math.min(Math.max(pageSize * 3, 20), 100);

  const [notes, tasks, projects] = await Promise.all([
    !normalizedType || normalizedType === 'note'
      ? Note.find({
        workspaceId,
        isArchived: false,
        $or: [{ title: safeRegex }, { contentText: safeRegex }],
        ...(tags ? { tags: { $in: tags } } : {}),
        ...(projectId ? { projectId } : {}),
      })
        .sort({ updatedAt: -1 })
        .limit(dbLimit)
        .select('title contentText updatedAt tags')
        .lean()
      : [],
    !normalizedType || normalizedType === 'task'
      ? Task.find({
        workspaceId,
        $or: [{ title: safeRegex }, { description: safeRegex }],
        ...(tags ? { tagIds: { $in: tags } } : {}),
        ...(projectId ? { projectId } : {}),
      })
        .sort({ updatedAt: -1 })
        .limit(dbLimit)
        .select('title description status priority dueDate')
        .lean()
      : [],
    !normalizedType || normalizedType === 'project'
      ? Project.find({
        workspaceId,
        $or: [{ name: safeRegex }, { description: safeRegex }],
      })
        .sort({ updatedAt: -1 })
        .limit(dbLimit)
        .select('name description status')
        .lean()
      : [],
  ]);

  notes.forEach((note) => {
    results.push({
      type: 'note',
      item: note,
      score: Math.max(scoreText(normalizedQuery, note.title), scoreText(normalizedQuery, note.contentText)) + 1,
    });
  });

  tasks.forEach((task) => {
    results.push({
      type: 'task',
      item: task,
      score: Math.max(scoreText(normalizedQuery, task.title), scoreText(normalizedQuery, task.description)) + 1,
    });
  });

  projects.forEach((project) => {
    results.push({
      type: 'project',
      item: project,
      score: Math.max(scoreText(normalizedQuery, project.name), scoreText(normalizedQuery, project.description)) + 1,
    });
  });

  results.sort((a, b) => b.score - a.score);
  const paginated = results.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

  return { results: paginated, total: results.length, page: pageNumber, limit: pageSize };
};

module.exports = { globalSearch };
