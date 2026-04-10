const AiLog = require('../../models/AiLog');
const Note = require('../../models/Note');

const callGemini = async (prompt, systemPrompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw { status: 503, message: 'AI service not configured' };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
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
    const err = await response.json();
    throw { status: 502, message: 'AI API error: ' + (err.error?.message || 'Unknown') };
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
  const prompt = `Given these tasks for today, suggest a prioritized order and schedule. Explain briefly why.\n\nTasks:\n${taskList}`;

  const plan = await callGemini(prompt, 'You are a productivity coach helping users plan their day effectively.');
  await AiLog.create({ workspaceId, userId, feature: 'planning', response: plan });

  return { plan, aiGenerated: true };
};

const answerFromWorkspace = async (workspaceId, userId, question) => {
  const notes = await Note.find({ workspaceId, isArchived: false }).limit(20).select('title contentText');
  const context = notes.map(n => `[Note: ${n.title}]\n${(n.contentText || '').substring(0, 500)}`).join('\n\n');

  const prompt = `Using only the following workspace content, answer this question: "${question}"\n\nWorkspace content:\n${context.substring(0, 6000)}\n\nIf the answer is not in the content, say so.`;

  const answer = await callGemini(prompt, 'You are an assistant that answers questions based only on the provided workspace content. Always cite which notes you referenced.');
  await AiLog.create({ workspaceId, userId, feature: 'workspace_qa', response: { question, answer } });

  return { answer, question, aiGenerated: true };
};

module.exports = { summarizeNote, extractTasks, rewriteNote, planToday, answerFromWorkspace };
