/**
 * Semantic search service.
 * Uses Gemini embeddings if available, falls back to enhanced keyword search.
 * Vector store: in-memory cache for now (can be swapped for Pinecone/Chroma later).
 */
const Note    = require('../../models/Note');
const Task    = require('../../models/Task');
const Project = require('../../models/Project');

// ── Cosine similarity ─────────────────────────────────────────────────────────
const cosineSim = (a, b) => {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// ── Gemini embedding ──────────────────────────────────────────────────────────
const getEmbedding = async (text) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'models/embedding-001', content: { parts: [{ text: text.slice(0, 2048) }] } }),
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.embedding?.values || null;
  } catch {
    return null;
  }
};

// ── Simple TF-IDF-like term weighting for fallback ────────────────────────────
const tokenize = (text) =>
  (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);

const termFreq = (tokens, term) => tokens.filter(t => t === term).length / Math.max(tokens.length, 1);

const scoreText = (query, text) => {
  const qTokens = tokenize(query);
  const tTokens = tokenize(text);
  if (!qTokens.length || !tTokens.length) return 0;
  return qTokens.reduce((score, qt) => {
    const exact   = tTokens.includes(qt) ? 1 : 0;
    const partial = tTokens.filter(t => t.includes(qt) || qt.includes(t)).length;
    return score + exact * 2 + partial * 0.5;
  }, 0) / qTokens.length;
};

/**
 * Semantic search across notes, tasks, and projects.
 * Returns results sorted by relevance.
 */
const semanticSearch = async (workspaceId, userId, query, { limit = 20, types = ['note','task','project'] } = {}) => {
  if (!query?.trim()) return { results: [] };

  const queryEmb = await getEmbedding(query);
  const results  = [];

  // Notes
  if (types.includes('note')) {
    const notes = await Note.find({ workspaceId, isArchived: false }).select('title contentText content tags').limit(200);
    for (const note of notes) {
      const text  = `${note.title} ${note.contentText || ''}`;
      let score   = scoreText(query, text);
      if (queryEmb) {
        const noteEmb = await getEmbedding(text);
        if (noteEmb) score = Math.max(score, cosineSim(queryEmb, noteEmb) * 10);
      }
      if (score > 0.1) results.push({ type: 'note', id: note._id, title: note.title, excerpt: (note.contentText || '').slice(0, 150), score });
    }
  }

  // Tasks
  if (types.includes('task')) {
    const tasks = await Task.find({ workspaceId }).select('title description status priority').limit(200);
    for (const task of tasks) {
      const text  = `${task.title} ${task.description || ''}`;
      const score = scoreText(query, text);
      if (score > 0.1) results.push({ type: 'task', id: task._id, title: task.title, excerpt: task.description?.slice(0, 100) || '', status: task.status, priority: task.priority, score });
    }
  }

  // Projects
  if (types.includes('project')) {
    const projects = await Project.find({ workspaceId }).select('name description').limit(50);
    for (const proj of projects) {
      const text  = `${proj.name} ${proj.description || ''}`;
      const score = scoreText(query, text);
      if (score > 0.1) results.push({ type: 'project', id: proj._id, title: proj.name, excerpt: proj.description?.slice(0, 100) || '', score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return { results: results.slice(0, limit), query };
};

/**
 * Auto-detect and create backlinks between notes.
 * Scans all notes in workspace and links notes that mention each other by title.
 */
const autoCreateBacklinks = async (workspaceId) => {
  const Link = require('../../models/Link');
  const notes = await Note.find({ workspaceId, isArchived: false }).select('_id title contentText');

  let created = 0;
  for (const source of notes) {
    const text = (source.contentText || '').toLowerCase();
    for (const target of notes) {
      if (source._id.equals(target._id)) continue;
      const mentioned = text.includes(target.title.toLowerCase()) && target.title.length > 3;
      if (!mentioned) continue;

      const exists = await Link.findOne({
        sourceId: source._id, targetId: target._id,
        sourceType: 'note', targetType: 'note',
      });
      if (!exists) {
        await Link.create({
          workspaceId, sourceId: source._id, sourceType: 'note',
          targetId: target._id, targetType: 'note', relation: 'mentions',
        });
        created++;
      }
    }
  }
  return created;
};

module.exports = { semanticSearch, autoCreateBacklinks };
