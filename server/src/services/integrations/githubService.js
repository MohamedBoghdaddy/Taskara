/**
 * GitHub Integration Service
 * Credentials come from the user's saved IntegrationSettings — not env vars.
 *
 * Capabilities:
 *  - Verify token + fetch authenticated user
 *  - List repos the token can access
 *  - Import GitHub Issues → Taskara Tasks
 *  - Export Taskara Task → GitHub Issue
 *  - Link a commit/PR reference to a task
 */

const GITHUB_API = 'https://api.github.com';

function githubHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Taskara-App',
  };
}

/** Verify token and return GitHub user profile. */
async function verifyToken(accessToken) {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: githubHeaders(accessToken),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub auth failed (${res.status})`);
  }
  return res.json(); // { login, name, avatar_url, public_repos, ... }
}

/** List repos accessible to the token (first 100). */
async function listRepos(accessToken) {
  const res = await fetch(`${GITHUB_API}/user/repos?per_page=100&sort=updated`, {
    headers: githubHeaders(accessToken),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Failed to list repos (${res.status})`);
  const repos = await res.json();
  return repos.map(r => ({
    id: r.id,
    fullName: r.full_name,
    owner: r.owner.login,
    repo: r.name,
    private: r.private,
    description: r.description,
    url: r.html_url,
  }));
}

/** Map GitHub issue priority label to Taskara priority. */
function mapIssuePriority(labels = []) {
  const names = labels.map(l => l.name.toLowerCase());
  if (names.includes('urgent') || names.includes('critical')) return 'urgent';
  if (names.includes('high') || names.includes('priority:high')) return 'high';
  if (names.includes('low') || names.includes('priority:low')) return 'low';
  return 'medium';
}

/** Map GitHub issue state to Taskara status. */
function mapIssueStatus(state) {
  return state === 'closed' ? 'done' : 'todo';
}

/**
 * Import open GitHub issues from one repo → Taskara Tasks.
 * Skips issues already imported (deduped by meta.githubIssueId).
 */
async function importIssues(accessToken, owner, repo, workspaceId, userId, projectId = null) {
  const Task = require('../../models/Task');

  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/issues?state=open&per_page=100&sort=updated`,
    { headers: githubHeaders(accessToken), signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) throw new Error(`Failed to fetch issues from ${owner}/${repo} (${res.status})`);
  const issues = await res.json();

  // Filter out pull requests (GitHub returns PRs in issues endpoint)
  const realIssues = issues.filter(i => !i.pull_request);

  let imported = 0;
  let skipped = 0;

  for (const issue of realIssues) {
    const existing = await Task.findOne({
      workspaceId,
      'meta.githubIssueId': issue.id,
    });
    if (existing) { skipped++; continue; }

    await Task.create({
      workspaceId,
      createdBy: userId,
      projectId: projectId || undefined,
      title: issue.title,
      description: issue.body || '',
      status: mapIssueStatus(issue.state),
      priority: mapIssuePriority(issue.labels),
      tags: issue.labels.map(l => l.name),
      meta: {
        githubIssueId: issue.id,
        githubIssueNumber: issue.number,
        githubRepo: `${owner}/${repo}`,
        githubUrl: issue.html_url,
      },
    });
    imported++;
  }

  return { total: realIssues.length, imported, skipped };
}

/**
 * Export a Taskara task as a GitHub issue.
 * Returns the created issue URL.
 */
async function exportTaskAsIssue(accessToken, owner, repo, task) {
  const labels = task.tags || [];
  if (task.priority === 'urgent' || task.priority === 'high') {
    labels.push(`priority:${task.priority}`);
  }

  const body = {
    title: task.title,
    body: task.description || '',
    labels,
  };

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: { ...githubHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to create GitHub issue (${res.status})`);
  }

  const issue = await res.json();
  return { issueNumber: issue.number, url: issue.html_url, id: issue.id };
}

/**
 * Fetch commits for a repo (used for linking commits to tasks).
 */
async function listRecentCommits(accessToken, owner, repo, limit = 20) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=${limit}`,
    { headers: githubHeaders(accessToken), signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`Failed to fetch commits (${res.status})`);
  const commits = await res.json();
  return commits.map(c => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0],
    author: c.commit.author.name,
    date: c.commit.author.date,
    url: c.html_url,
  }));
}

module.exports = { verifyToken, listRepos, importIssues, exportTaskAsIssue, listRecentCommits };
