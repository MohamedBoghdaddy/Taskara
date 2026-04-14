/**
 * Notion Integration Service
 * Credentials come from the user's saved IntegrationSettings — not env vars.
 *
 * Auth model: User creates an Internal Integration at notion.so/my-integrations,
 * copies the "Internal Integration Secret" (starts with "secret_"), and
 * shares their databases/pages with that integration.
 *
 * Capabilities:
 *  - Verify token + fetch workspace info
 *  - List databases the integration can access
 *  - Import Notion database rows → Taskara Tasks
 *  - Import Notion pages → Taskara Notes
 */

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

function notionHeaders(apiToken) {
  return {
    Authorization: `Bearer ${apiToken}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

/** Verify token — fetch integration bot user info. */
async function verifyToken(apiToken) {
  const res = await fetch(`${NOTION_API}/users/me`, {
    headers: notionHeaders(apiToken),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Notion auth failed (${res.status}). Check your Integration Token.`);
  }
  const data = await res.json();
  return {
    botId: data.id,
    workspaceName: data.bot?.workspace_name || 'Notion Workspace',
    name: data.name,
  };
}

/** List databases accessible to this integration. */
async function listDatabases(apiToken) {
  const res = await fetch(`${NOTION_API}/search`, {
    method: 'POST',
    headers: notionHeaders(apiToken),
    body: JSON.stringify({ filter: { value: 'database', property: 'object' }, page_size: 50 }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Failed to list Notion databases (${res.status})`);
  const data = await res.json();
  return (data.results || []).map(db => ({
    id: db.id,
    title: db.title?.[0]?.plain_text || 'Untitled',
    url: db.url,
    properties: Object.keys(db.properties || {}),
  }));
}

/** List pages accessible to this integration. */
async function listPages(apiToken) {
  const res = await fetch(`${NOTION_API}/search`, {
    method: 'POST',
    headers: notionHeaders(apiToken),
    body: JSON.stringify({ filter: { value: 'page', property: 'object' }, page_size: 50 }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Failed to list Notion pages (${res.status})`);
  const data = await res.json();
  return (data.results || []).map(p => ({
    id: p.id,
    title: p.properties?.title?.title?.[0]?.plain_text
      || p.properties?.Name?.title?.[0]?.plain_text
      || 'Untitled',
    url: p.url,
    lastEdited: p.last_edited_time,
  }));
}

/** Extract plain text from a Notion rich_text array. */
function richTextToPlain(arr = []) {
  return arr.map(r => r.plain_text || '').join('');
}

/** Map a Notion database row property value → plain string/date/boolean. */
function extractPropValue(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':       return richTextToPlain(prop.title);
    case 'rich_text':   return richTextToPlain(prop.rich_text);
    case 'number':      return prop.number;
    case 'checkbox':    return prop.checkbox;
    case 'select':      return prop.select?.name || null;
    case 'multi_select':return prop.multi_select?.map(s => s.name) || [];
    case 'date':        return prop.date?.start || null;
    case 'url':         return prop.url;
    case 'email':       return prop.email;
    case 'phone_number':return prop.phone_number;
    case 'status':      return prop.status?.name || null;
    case 'people':      return prop.people?.map(p => p.name).join(', ') || null;
    default:            return null;
  }
}

/** Guess Taskara priority from a Notion property value. */
function guessPriority(val) {
  if (!val) return 'medium';
  const v = String(val).toLowerCase();
  if (v.includes('urgent') || v.includes('critical')) return 'urgent';
  if (v.includes('high'))   return 'high';
  if (v.includes('low'))    return 'low';
  return 'medium';
}

/**
 * Import rows from a Notion database → Taskara Tasks.
 * Auto-maps common column names (Title, Name, Priority, Due, Assignee, Status, Tags).
 */
async function importDatabaseAsTasks(apiToken, databaseId, workspaceId, userId, projectId = null) {
  const Task = require('../../models/Task');

  const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
    method: 'POST',
    headers: notionHeaders(apiToken),
    body: JSON.stringify({ page_size: 100 }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Failed to query Notion database (${res.status})`);
  const data = await res.json();

  let imported = 0;
  let skipped = 0;

  for (const row of data.results || []) {
    const props = row.properties || {};

    // Find the title property (could be named 'Name', 'Title', 'Task', etc.)
    const titleProp = Object.values(props).find(p => p.type === 'title');
    const title = richTextToPlain(titleProp?.title || []).trim();
    if (!title) { skipped++; continue; }

    const existing = await Task.findOne({ workspaceId, 'meta.notionPageId': row.id });
    if (existing) { skipped++; continue; }

    // Map common Notion columns
    const priorityVal = extractPropValue(props['Priority'] || props['priority'] || props['Urgent']);
    const dueVal      = extractPropValue(props['Due'] || props['Due Date'] || props['Deadline'] || props['Date']);
    const statusVal   = extractPropValue(props['Status'] || props['status'] || props['State']);
    const tagsVal     = extractPropValue(props['Tags'] || props['Labels'] || props['Category']) || [];
    const descVal     = richTextToPlain(
      Object.values(props).find(p => p.type === 'rich_text')?.rich_text || []
    );

    const statusMap = {
      'done': 'done', 'complete': 'done', 'completed': 'done', 'finished': 'done',
      'in progress': 'in_progress', 'doing': 'in_progress', 'active': 'in_progress',
      'blocked': 'blocked', 'not started': 'todo', 'todo': 'todo',
    };
    const mappedStatus = statusMap[(statusVal || '').toLowerCase()] || 'todo';

    await Task.create({
      workspaceId,
      createdBy: userId,
      projectId: projectId || undefined,
      title,
      description: descVal,
      priority: guessPriority(priorityVal),
      status: mappedStatus,
      dueDate: dueVal ? new Date(dueVal) : undefined,
      tags: Array.isArray(tagsVal) ? tagsVal : (tagsVal ? [tagsVal] : []),
      meta: {
        notionPageId: row.id,
        notionDatabaseId: databaseId,
        notionUrl: row.url,
      },
    });
    imported++;
  }

  return { total: data.results?.length || 0, imported, skipped };
}

/**
 * Import Notion pages → Taskara Notes.
 * Fetches page blocks and converts to plain text content.
 */
async function importPagesAsNotes(apiToken, pageIds, workspaceId, userId) {
  const Note = require('../../models/Note');
  let imported = 0;
  let skipped = 0;

  for (const pageId of pageIds) {
    const existing = await Note.findOne({ workspaceId, 'meta.notionPageId': pageId });
    if (existing) { skipped++; continue; }

    // Fetch page metadata
    const metaRes = await fetch(`${NOTION_API}/pages/${pageId}`, {
      headers: notionHeaders(apiToken),
      signal: AbortSignal.timeout(10000),
    });
    if (!metaRes.ok) { skipped++; continue; }
    const pageMeta = await metaRes.json();

    const props = pageMeta.properties || {};
    const titleProp = Object.values(props).find(p => p.type === 'title');
    const title = richTextToPlain(titleProp?.title || []).trim() || 'Untitled Notion Page';

    // Fetch blocks (page content)
    const blocksRes = await fetch(`${NOTION_API}/blocks/${pageId}/children?page_size=100`, {
      headers: notionHeaders(apiToken),
      signal: AbortSignal.timeout(10000),
    });
    let contentText = '';
    if (blocksRes.ok) {
      const blocksData = await blocksRes.json();
      contentText = (blocksData.results || [])
        .map(block => {
          const textArr = block[block.type]?.rich_text || [];
          return richTextToPlain(textArr);
        })
        .filter(Boolean)
        .join('\n');
    }

    await Note.create({
      workspaceId,
      createdBy: userId,
      title,
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: contentText }] }] },
      contentText,
      meta: { notionPageId: pageId, notionUrl: pageMeta.url },
    });
    imported++;
  }

  return { total: pageIds.length, imported, skipped };
}

module.exports = { verifyToken, listDatabases, listPages, importDatabaseAsTasks, importPagesAsNotes };
