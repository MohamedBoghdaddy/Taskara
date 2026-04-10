const Note = require('../../models/Note');
const Task = require('../../models/Task');
const Project = require('../../models/Project');

const globalSearch = async (workspaceId, userId, { q, type, tags, projectId, page = 1, limit = 20 }) => {
  if (!q || q.trim().length < 1) return { results: [], total: 0 };

  const results = [];
  const searchRegex = new RegExp(q, 'i');

  if (!type || type === 'note') {
    const notes = await Note.find({
      workspaceId,
      isArchived: false,
      $or: [{ title: searchRegex }, { contentText: searchRegex }],
      ...(tags ? { tags: { $in: tags } } : {}),
      ...(projectId ? { projectId } : {}),
    }).limit(limit).select('title contentText updatedAt tags');
    notes.forEach(n => results.push({ type: 'note', item: n, score: n.title.match(searchRegex) ? 2 : 1 }));
  }

  if (!type || type === 'task') {
    const tasks = await Task.find({
      workspaceId,
      $or: [{ title: searchRegex }, { description: searchRegex }],
      ...(tags ? { tagIds: { $in: tags } } : {}),
      ...(projectId ? { projectId } : {}),
    }).limit(limit).select('title description status priority dueDate');
    tasks.forEach(t => results.push({ type: 'task', item: t, score: t.title.match(searchRegex) ? 2 : 1 }));
  }

  if (!type || type === 'project') {
    const projects = await Project.find({
      workspaceId,
      $or: [{ name: searchRegex }, { description: searchRegex }],
    }).limit(limit).select('name description status');
    projects.forEach(p => results.push({ type: 'project', item: p, score: p.name.match(searchRegex) ? 2 : 1 }));
  }

  results.sort((a, b) => b.score - a.score);
  const paginated = results.slice((page - 1) * limit, page * limit);

  return { results: paginated, total: results.length, page, limit };
};

module.exports = { globalSearch };
