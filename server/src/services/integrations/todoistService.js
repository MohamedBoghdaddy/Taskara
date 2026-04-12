/**
 * Todoist integration service.
 * Imports tasks from Todoist API into Taskara.
 */
const Task = require('../../models/Task');

const TODOIST_API = 'https://api.todoist.com/rest/v2';

const fetchTodoistTasks = async (apiToken) => {
  const resp = await fetch(`${TODOIST_API}/tasks`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!resp.ok) throw new Error(`Todoist API error: ${resp.status}`);
  return resp.json();
};

const fetchTodoistProjects = async (apiToken) => {
  const resp = await fetch(`${TODOIST_API}/projects`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!resp.ok) throw new Error(`Todoist API error: ${resp.status}`);
  return resp.json();
};

const PRIORITY_MAP = { 4: 'urgent', 3: 'high', 2: 'medium', 1: 'low' };

/**
 * Import all active tasks from Todoist into Taskara workspace.
 */
const importFromTodoist = async (workspaceId, userId, apiToken) => {
  const [tasks, projects] = await Promise.all([
    fetchTodoistTasks(apiToken),
    fetchTodoistProjects(apiToken),
  ]);

  const projMap = {};
  projects.forEach(p => { projMap[p.id] = p.name; });

  let imported = 0, skipped = 0;
  for (const t of tasks) {
    // Skip if already imported (check by title + source)
    const exists = await Task.findOne({
      workspaceId,
      title:  t.content,
      'meta.todoistId': t.id,
    });
    if (exists) { skipped++; continue; }

    await Task.create({
      workspaceId,
      createdBy:   userId,
      title:       t.content,
      description: t.description || '',
      status:      'todo',
      priority:    PRIORITY_MAP[t.priority] || 'medium',
      dueDate:     t.due?.date ? new Date(t.due.date) : null,
    });
    imported++;
  }

  return { imported, skipped, total: tasks.length };
};

/**
 * Push a Taskara task to Todoist.
 */
const pushTaskToTodoist = async (apiToken, task) => {
  const priority = { urgent: 4, high: 3, medium: 2, low: 1 }[task.priority] || 1;
  const resp = await fetch(`${TODOIST_API}/tasks`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content:  task.title,
      priority,
      due_date: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : undefined,
    }),
  });
  if (!resp.ok) throw new Error(`Todoist push failed: ${resp.status}`);
  return resp.json();
};

module.exports = { importFromTodoist, pushTaskToTodoist };
