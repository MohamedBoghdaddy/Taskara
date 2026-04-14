/**
 * ClickUp Integration Service
 * Credentials come from the user's saved IntegrationSettings — not env vars.
 *
 * Auth model: User copies their Personal API Token from
 *  ClickUp → Profile → Apps → API Token
 *
 * Capabilities:
 *  - Verify token + fetch workspace (team) info
 *  - List workspaces, spaces, folders, and lists
 *  - Import ClickUp tasks from a list → Taskara Tasks
 *  - Export Taskara task → ClickUp task
 */

const CLICKUP_API = 'https://api.clickup.com/api/v2';

function cuHeaders(apiKey) {
  return {
    Authorization: apiKey,
    'Content-Type': 'application/json',
  };
}

/** Verify API key and return authorized teams (workspaces). */
async function verifyToken(apiKey) {
  const res = await fetch(`${CLICKUP_API}/team`, {
    headers: cuHeaders(apiKey),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!res.ok || data.err) {
    throw new Error(data.err || `ClickUp auth failed (${res.status}). Check your API Token.`);
  }
  const teams = data.teams || [];
  return {
    teams: teams.map(t => ({ id: t.id, name: t.name, members: t.members?.length || 0 })),
  };
}

/** List spaces within a team. */
async function listSpaces(apiKey, teamId) {
  const res = await fetch(`${CLICKUP_API}/team/${teamId}/space?archived=false`, {
    headers: cuHeaders(apiKey),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.err || `Failed to list ClickUp spaces (${res.status})`);
  return (data.spaces || []).map(s => ({ id: s.id, name: s.name }));
}

/** List lists within a space (flat — goes through folders). */
async function listLists(apiKey, spaceId) {
  const lists = [];

  // Folder-less lists
  const flRes = await fetch(`${CLICKUP_API}/space/${spaceId}/list?archived=false`, {
    headers: cuHeaders(apiKey),
    signal: AbortSignal.timeout(10000),
  });
  if (flRes.ok) {
    const flData = await flRes.json();
    for (const l of flData.lists || []) lists.push({ id: l.id, name: l.name, folder: null });
  }

  // Lists inside folders
  const fRes = await fetch(`${CLICKUP_API}/space/${spaceId}/folder?archived=false`, {
    headers: cuHeaders(apiKey),
    signal: AbortSignal.timeout(10000),
  });
  if (fRes.ok) {
    const fData = await fRes.json();
    for (const folder of fData.folders || []) {
      const lfRes = await fetch(`${CLICKUP_API}/folder/${folder.id}/list?archived=false`, {
        headers: cuHeaders(apiKey),
        signal: AbortSignal.timeout(10000),
      });
      if (lfRes.ok) {
        const lfData = await lfRes.json();
        for (const l of lfData.lists || []) {
          lists.push({ id: l.id, name: l.name, folder: folder.name });
        }
      }
    }
  }

  return lists;
}

/** Map ClickUp priority number → Taskara priority string. */
function mapPriority(cu) {
  if (!cu) return 'medium';
  const p = typeof cu === 'object' ? cu.priority : cu;
  switch (Number(p)) {
    case 1: return 'urgent';
    case 2: return 'high';
    case 3: return 'medium';
    case 4: return 'low';
    default: return 'medium';
  }
}

/** Map ClickUp status → Taskara status. */
function mapStatus(cuStatus) {
  if (!cuStatus) return 'todo';
  const name = (typeof cuStatus === 'string' ? cuStatus : cuStatus.status || '').toLowerCase();
  if (['complete', 'done', 'closed', 'finished'].some(s => name.includes(s))) return 'done';
  if (['in progress', 'doing', 'active', 'in review'].some(s => name.includes(s))) return 'in_progress';
  if (['blocked', 'on hold'].some(s => name.includes(s))) return 'blocked';
  return 'todo';
}

/**
 * Import tasks from a ClickUp list → Taskara Tasks.
 * Dedupes by meta.clickupTaskId.
 */
async function importTasksFromList(apiKey, listId, workspaceId, userId, projectId = null) {
  const Task = require('../../models/Task');

  const res = await fetch(
    `${CLICKUP_API}/list/${listId}/task?archived=false&subtasks=true&include_closed=false&page=0`,
    { headers: cuHeaders(apiKey), signal: AbortSignal.timeout(20000) }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.err || `Failed to fetch ClickUp tasks (${res.status})`);

  const tasks = data.tasks || [];
  let imported = 0;
  let skipped = 0;

  for (const t of tasks) {
    const existing = await Task.findOne({ workspaceId, 'meta.clickupTaskId': t.id });
    if (existing) { skipped++; continue; }

    const dueDate = t.due_date ? new Date(Number(t.due_date)) : undefined;

    await Task.create({
      workspaceId,
      createdBy: userId,
      projectId: projectId || undefined,
      title: t.name,
      description: t.description || '',
      status: mapStatus(t.status),
      priority: mapPriority(t.priority),
      dueDate,
      tags: (t.tags || []).map(tag => tag.name),
      meta: {
        clickupTaskId: t.id,
        clickupListId: listId,
        clickupUrl: t.url,
      },
    });
    imported++;
  }

  return { total: tasks.length, imported, skipped };
}

/**
 * Export a Taskara task → ClickUp task in the specified list.
 * Returns the created ClickUp task URL.
 */
async function exportTaskToClickUp(apiKey, listId, task) {
  const priorityMap = { urgent: 1, high: 2, medium: 3, low: 4 };

  const body = {
    name: task.title,
    description: task.description || '',
    priority: priorityMap[task.priority] || 3,
    due_date: task.dueDate ? new Date(task.dueDate).getTime() : undefined,
    tags: task.tags || [],
  };

  const res = await fetch(`${CLICKUP_API}/list/${listId}/task`, {
    method: 'POST',
    headers: cuHeaders(apiKey),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.err || `Failed to export task to ClickUp (${res.status})`);
  return { taskId: data.id, url: data.url };
}

module.exports = { verifyToken, listSpaces, listLists, importTasksFromList, exportTaskToClickUp };
