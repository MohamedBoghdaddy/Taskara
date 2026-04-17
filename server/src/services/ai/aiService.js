const AiLog = require('../../models/AiLog');
const Note = require('../../models/Note');

const priorityRank = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const tokenize = (value = '') =>
  String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

const scoreNoteRelevance = (note, tokens = []) => {
  const haystack = `${note.title || ''} ${(note.contentText || '').slice(0, 2000)}`.toLowerCase();
  return tokens.reduce((score, token) => {
    if (!haystack.includes(token)) return score;
    const titleBoost = String(note.title || '').toLowerCase().includes(token) ? 2 : 1;
    return score + titleBoost;
  }, 0);
};

const buildFallbackWorkspaceAnswer = (sources, question) => {
  if (!sources.length) {
    return `I could not find enough matching workspace context for "${question}". Try asking about a note title, project, or task name that already exists.`;
  }

  const [primary] = sources;
  return `The strongest match for "${question}" is ${primary.title}. I used ${sources.length} note source${sources.length === 1 ? '' : 's'} to answer this, so review the cited notes before acting on it.`;
};

const sortTasksForToday = (tasks = []) =>
  [...tasks].sort((left, right) => {
    const leftPriority = priorityRank[left.priority] ?? 99;
    const rightPriority = priorityRank[right.priority] ?? 99;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;

    const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Number.POSITIVE_INFINITY;
    if (leftDue !== rightDue) return leftDue - rightDue;

    return String(left.title || '').localeCompare(String(right.title || ''));
  });

const buildFallbackTodayPlan = (tasks = []) => {
  const sorted = sortTasksForToday(tasks);
  const now = Date.now();
  const priorities = sorted.slice(0, 3).map((task, index) => ({
    title: task.title,
    priority: task.priority || 'medium',
    reason:
      index === 0
        ? 'Highest combined urgency based on priority and due date.'
        : index === 1
          ? 'Best next item once the top priority is moving.'
          : 'Useful follow-up after the most urgent work is stable.',
    dueDate: task.dueDate || null,
  }));
  const schedule = priorities.map((task, index) => ({
    slot: index === 0 ? 'Now' : index === 1 ? 'Next' : 'Later',
    title: task.title,
    focus: index === 0 ? 'Deep work block' : index === 1 ? 'Execution block' : 'Cleanup block',
  }));
  const risks = sorted
    .filter((task) => task.status === 'blocked' || (task.dueDate && new Date(task.dueDate).getTime() < now))
    .slice(0, 3)
    .map((task) => ({
      title: task.title,
      risk:
        task.status === 'blocked'
          ? 'Blocked item needs clarification before it becomes a hidden drag on the day.'
          : 'Overdue item should be reviewed before lower-priority work.',
    }));

  const summary = priorities.length
    ? `Start with ${priorities[0].title}, keep one follow-up ready, and protect the rest of the day from lower-value context switching.`
    : 'No tasks are due today yet, so use the time to capture priorities, clear inbox items, or plan your next focus block.';

  return {
    priorities,
    schedule,
    risks,
    summary,
    plan: [summary]
      .concat(schedule.map((entry) => `${entry.slot}: ${entry.title} (${entry.focus})`))
      .join('\n'),
    confidence: priorities.length ? 76 : 42,
  };
};

const callGemini = async (prompt, systemPrompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const apiVersion = process.env.GEMINI_API_VERSION || 'v1beta';
  if (!apiKey) {
    throw { status: 503, message: 'AI service not configured' };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw { status: 502, message: 'AI API error: ' + (err.error?.message || `Request failed for model ${model}`) };
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

const callGeminiOrFallback = async ({ prompt, systemPrompt, fallback }) => {
  try {
    return await callGemini(prompt, systemPrompt);
  } catch (_) {
    return typeof fallback === 'function' ? fallback() : fallback;
  }
};

const summarizeNote = async (workspaceId, userId, noteId) => {
  const note = await Note.findOne({ _id: noteId, workspaceId });
  if (!note) throw { status: 404, message: 'Note not found' };

  const text = note.contentText || (typeof note.content === 'string' ? note.content : JSON.stringify(note.content));
  const prompt = `Summarize the following note in 3-5 bullet points. Be concise and focus on key information.\n\nNote title: ${note.title}\n\nContent:\n${text.substring(0, 4000)}`;

  const summary = await callGemini(prompt, 'You are a helpful assistant that summarizes notes clearly and concisely.');

  await AiLog.create({ workspaceId, userId, feature: 'summary', inputRef: { entityType: 'note', entityId: noteId }, response: summary });

  return { summary, noteId, aiGenerated: true };
};

const extractTasks = async (workspaceId, userId, noteId) => {
  const note = await Note.findOne({ _id: noteId, workspaceId });
  if (!note) throw { status: 404, message: 'Note not found' };

  const text = note.contentText || (typeof note.content === 'string' ? note.content : JSON.stringify(note.content));
  const prompt = `Extract actionable tasks from the following text. Return a JSON array of task objects with fields: title (string), priority (low/medium/high), estimateMinutes (number or null). Return ONLY valid JSON.\n\nText:\n${text.substring(0, 4000)}`;

  const raw = await callGemini(prompt);

  let tasks = [];
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) tasks = JSON.parse(jsonMatch[0]);
  } catch (e) {
    tasks = [];
  }

  await AiLog.create({ workspaceId, userId, feature: 'task_extraction', inputRef: { entityType: 'note', entityId: noteId }, response: tasks });

  return { tasks, noteId, aiGenerated: true };
};

const rewriteNote = async (workspaceId, userId, { noteId, content, format }) => {
  const formats = {
    concise: 'Rewrite the following text to be more concise while preserving key points.',
    formal: 'Rewrite the following text in a professional, formal tone.',
    action_items: 'Convert the following text into a clear list of action items.',
    summary: 'Write a brief executive summary of the following text.',
  };

  const instruction = formats[format] || formats.concise;
  const text = content || '';
  const prompt = `${instruction}\n\nText:\n${text.substring(0, 4000)}`;

  const rewritten = await callGemini(prompt);
  await AiLog.create({ workspaceId, userId, feature: 'rewrite', inputRef: noteId ? { entityType: 'note', entityId: noteId } : {}, response: { format, rewritten } });

  return { rewritten, format, aiGenerated: true };
};

const planToday = async (workspaceId, userId, tasks) => {
  const taskList = tasks.map(t => `- ${t.title} (priority: ${t.priority}, due: ${t.dueDate || 'none'})`).join('\n');
  const fallback = buildFallbackTodayPlan(tasks);
  const prompt = `Given these tasks for today, produce a crisp execution plan.
Lead with one short summary sentence, then list the first three priorities with a short reason, then mention any major risks or blockers.

Tasks:
${taskList || '- No tasks yet'}`;

  const plan = await callGeminiOrFallback({
    prompt,
    systemPrompt: 'You are a pragmatic execution coach. Help the user focus, sequence work, and call out blockers without fluff.',
    fallback: fallback.plan,
  });
  await AiLog.create({ workspaceId, userId, feature: 'planning', response: plan });

  return {
    plan,
    summary: fallback.summary,
    priorities: fallback.priorities,
    schedule: fallback.schedule,
    risks: fallback.risks,
    confidence: fallback.confidence,
    aiGenerated: true,
  };
};

const answerFromWorkspace = async (workspaceId, userId, question) => {
  const notes = await Note.find({ workspaceId, isArchived: false }).limit(30).select('title contentText');
  const queryTokens = tokenize(question);
  const rankedNotes = notes
    .map((note) => ({
      note,
      relevance: scoreNoteRelevance(note, queryTokens),
    }))
    .filter((entry) => entry.relevance > 0)
    .sort((left, right) => right.relevance - left.relevance)
    .slice(0, 4);

  const sources = rankedNotes.map(({ note, relevance }) => ({
    noteId: note._id,
    title: note.title,
    relevance,
  }));

  const context = rankedNotes
    .map(({ note }) => `[Note: ${note.title}]\n${(note.contentText || '').substring(0, 700)}`)
    .join('\n\n');

  const prompt = `Using only the following workspace content, answer this question: "${question}".
If the answer is not in the content, say so plainly.
Close with "Sources:" and the note titles you used.

Workspace content:
${context.substring(0, 7000)}`;

  const answer = await callGeminiOrFallback({
    prompt,
    systemPrompt: 'You answer questions only from the provided workspace context. Be concise, operational, and explicit about uncertainty.',
    fallback: () => buildFallbackWorkspaceAnswer(sources, question),
  });
  await AiLog.create({ workspaceId, userId, feature: 'workspace_qa', response: { question, answer, sources } });

  return {
    answer,
    question,
    sources,
    confidence: sources.length ? Math.min(88, 52 + sources.length * 10) : 36,
    aiGenerated: true,
  };
};

/**
 * Convert meeting notes text into structured tasks.
 */
const meetingNotesToTasks = async (workspaceId, userId, text) => {
  const prompt = `You are an expert at extracting action items from meeting notes.
Extract all action items, decisions, and follow-ups from the following meeting notes.
Return a JSON array of objects with: title, assignee (string name or null), dueDate (ISO date or null), priority (low/medium/high), notes (brief context).
Return ONLY valid JSON.

Meeting notes:
${text.substring(0, 5000)}`;

  const raw = await callGemini(prompt);
  let tasks = [];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) tasks = JSON.parse(match[0]);
  } catch (_) {}

  await AiLog.create({ workspaceId, userId, feature: 'meeting_to_tasks', response: { tasks } });
  return { tasks, aiGenerated: true };
};

/**
 * Smart task prioritization based on context.
 */
const prioritizeTasks = async (workspaceId, userId, tasks) => {
  const list = tasks.map((t, i) => `${i+1}. ${t.title} | priority:${t.priority} | due:${t.dueDate || 'none'} | pomodoros:${t.estimatedPomodoros || 0}`).join('\n');
  const prompt = `You are a productivity expert. Given these tasks, provide a smart prioritization order for today.
For each task, explain in one sentence WHY it should be done in that order.
Return JSON: array of objects { id, title, rank, reason, suggestedTime }

Tasks:
${list}`;

  const raw = await callGemini(prompt, 'You are a productivity expert focused on deep work and task sequencing.');
  let result = [];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) result = JSON.parse(match[0]);
  } catch (_) {}

  await AiLog.create({ workspaceId, userId, feature: 'prioritization', response: { result } });
  return { prioritized: result, aiGenerated: true };
};

/**
 * Voice transcript → task (process transcribed text).
 */
const voiceToTask = async (workspaceId, userId, transcript) => {
  const prompt = `Convert the following spoken text into a structured task.
Extract: title, description, priority (low/medium/high), dueDate (ISO or null), tags (array of strings).
Return ONLY valid JSON object (not array).

Spoken text: "${transcript}"`;

  const raw = await callGemini(prompt);
  let task = null;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) task = JSON.parse(match[0]);
  } catch (_) {}

  if (!task) task = { title: transcript, priority: 'medium', description: '', dueDate: null, tags: [] };

  await AiLog.create({ workspaceId, userId, feature: 'voice_to_task', response: { transcript, task } });
  return { task, aiGenerated: true };
};

/**
 * Generate smart daily brief: what to focus on, burnout risk summary, motivation.
 */
const dailyBrief = async (workspaceId, userId, { tasks, focusScore, streak, burnoutRisk }) => {
  const taskList = (tasks || []).slice(0, 10).map(t => `- ${t.title} (${t.priority})`).join('\n');
  const prompt = `You are a personal productivity coach. Generate a motivating daily brief.

User data:
- Focus score today: ${focusScore || 'unknown'}/100
- Streak: ${streak || 0} days
- Burnout risk: ${burnoutRisk || 'none'}
- Today's tasks:
${taskList || '- No tasks yet'}

Write a brief 3-4 sentence daily brief that:
1. Acknowledges their current state
2. Suggests what to tackle first and why
3. Ends with a motivating insight or tip.
Keep it personal and energetic, not generic.`;

  const brief = await callGemini(prompt, 'You are an upbeat, pragmatic productivity coach.');
  await AiLog.create({ workspaceId, userId, feature: 'daily_brief', response: { brief } });
  return { brief, aiGenerated: true };
};

const generateAgencyContentIdeas = async (workspaceId, userId, { clientName = 'Client', campaignGoal = '', channels = [] }) => {
  const fallbackIdeas = [
    `${clientName}: announce one clear customer win tied to ${campaignGoal || 'the current campaign goal'}`,
    `${clientName}: behind-the-scenes post tailored for ${channels[0] || 'social'}`
      .trim(),
    `${clientName}: short performance update with one action-driving CTA`,
  ];
  const prompt = `Generate 3 concise content ideas for ${clientName}.
Campaign goal: ${campaignGoal || 'General awareness'}
Channels: ${(channels || []).join(', ') || 'social'}
Return as short bullet points.`;

  const ideasText = await callGeminiOrFallback({
    prompt,
    systemPrompt: 'You create practical content ideas for marketing agencies. Keep outputs execution-ready.',
    fallback: () => fallbackIdeas.map((idea) => `- ${idea}`).join('\n'),
  });

  const ideas = String(ideasText)
    .split('\n')
    .map((line) => line.replace(/^[\-\*\d\.\)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 5);

  await AiLog.create({ workspaceId, userId, feature: 'agency_content_ideas', response: { clientName, ideas } });
  return { ideas, aiGenerated: true };
};

const generateAgencyContentCalendar = async (workspaceId, userId, { clientName = 'Client', channels = [], theme = '' }) => {
  const defaults = ['Thought-leadership post', 'Proof point carousel', 'CTA update', 'Weekly recap']
    .map((title, index) => ({
      title: `${clientName} ${title}`,
      channel: channels[index % Math.max(channels.length, 1)] || 'linkedin',
      status: index === 0 ? 'draft' : 'review',
      theme: theme || 'Performance momentum',
    }));

  await AiLog.create({ workspaceId, userId, feature: 'agency_content_calendar', response: defaults });
  return { calendar: defaults, aiGenerated: true };
};

const generateAgencyReportSummary = async (workspaceId, userId, { reportTitle = 'Client report', metrics = {}, extracted = {} }) => {
  const fallback = `Summary for ${reportTitle}: performance tracked ${Object.keys(metrics || {}).length} key metric(s). Keep the next client update focused on momentum, blockers, and one clear next action.`;
  const prompt = `Write a concise client-ready monthly performance summary.
Report: ${reportTitle}
Metrics: ${JSON.stringify(metrics || {})}
Extracted signals: ${JSON.stringify(extracted || {})}
Keep it to 3-4 sentences.`;

  const summary = await callGeminiOrFallback({
    prompt,
    systemPrompt: 'You summarize campaign performance clearly for agency clients.',
    fallback,
  });

  await AiLog.create({ workspaceId, userId, feature: 'agency_report_summary', response: { reportTitle, summary } });
  return { summary, aiGenerated: true };
};

const generateRealEstateListingDescription = async (workspaceId, userId, { property = {} }) => {
  const fallback = `${property.title || 'Property'} in ${property.city || 'the area'} with ${property.bedrooms || 0} bedrooms and ${property.bathrooms || 0} bathrooms. Highlight the fit, keep the copy clear, and avoid exaggeration.`;
  const prompt = `Write a sharp real-estate listing description.
Property: ${JSON.stringify(property || {})}
Keep it buyer-friendly and specific.`;

  const description = await callGeminiOrFallback({
    prompt,
    systemPrompt: 'You write concise, trustworthy real-estate listing descriptions.',
    fallback,
  });

  await AiLog.create({ workspaceId, userId, feature: 'realestate_listing_description', response: { property, description } });
  return { description, aiGenerated: true };
};

const recommendRealEstateLeadMatches = async (workspaceId, userId, { lead = {}, properties = [] }) => {
  const matches = (properties || [])
    .slice(0, 3)
    .map((property, index) => ({
      propertyId: property._id,
      title: property.title,
      reason: index === 0
        ? 'Closest match to the lead budget and stated interest.'
        : 'Reasonable alternative with a similar location or layout.',
    }));

  await AiLog.create({ workspaceId, userId, feature: 'realestate_lead_match', response: { lead, matches } });
  return { matches, aiGenerated: true };
};

const summarizeRealEstateConversation = async (workspaceId, userId, { text = '' }) => {
  const fallback = text
    ? `Conversation summary: ${String(text).replace(/\s+/g, ' ').trim().slice(0, 180)}`
    : 'Conversation summary unavailable.';
  const prompt = `Summarize this real-estate buyer conversation in 2-3 sentences and end with one next best action.\n\n${text}`;

  const summary = await callGeminiOrFallback({
    prompt,
    systemPrompt: 'You summarize client conversations for real-estate teams.',
    fallback,
  });

  await AiLog.create({ workspaceId, userId, feature: 'realestate_conversation_summary', response: { summary } });
  return { summary, aiGenerated: true };
};

const generateOwnerSettlementSummary = async (workspaceId, userId, { ownerName = 'Owner', amount = 0, currency = 'USD', dueAt = null }) => {
  const summary = `Settlement update for ${ownerName}: ${currency} ${amount} is ${dueAt ? `targeted for ${dueAt}` : 'being prepared for release'}. Review payout recipient details before sending.`;
  await AiLog.create({ workspaceId, userId, feature: 'realestate_owner_update', response: { ownerName, amount, currency, dueAt, summary } });
  return { summary, aiGenerated: true };
};

module.exports = {
  answerFromWorkspace,
  dailyBrief,
  extractTasks,
  generateAgencyContentCalendar,
  generateAgencyContentIdeas,
  generateAgencyReportSummary,
  generateOwnerSettlementSummary,
  generateRealEstateListingDescription,
  meetingNotesToTasks,
  planToday,
  prioritizeTasks,
  recommendRealEstateLeadMatches,
  rewriteNote,
  summarizeNote,
  summarizeRealEstateConversation,
  voiceToTask,
};
