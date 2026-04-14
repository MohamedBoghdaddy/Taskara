/**
 * Google Calendar Integration Service
 * Credentials come from the user's saved IntegrationSettings — not env vars.
 *
 * Auth model: User provides their own OAuth2 credentials from Google Cloud Console
 * (Client ID + Client Secret + Refresh Token obtained via OAuth Playground).
 *
 * Capabilities:
 *  - Exchange refresh token for access token
 *  - List user's calendars
 *  - Push Taskara task due dates → Google Calendar events
 *  - Pull upcoming calendar events → Taskara reminders
 */

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

/**
 * Exchange a refresh token for a fresh access token.
 * Returns { access_token, expires_in }.
 */
async function refreshAccessToken(clientId, clientSecret, refreshToken) {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(10000),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || 'Failed to refresh Google token');
  }
  return data; // { access_token, expires_in, token_type }
}

/** Get a valid access token — refresh if needed. */
async function getAccessToken(creds) {
  // If user stored a direct access token (short-lived), use it.
  // Otherwise, use refresh flow.
  if (creds.refreshToken && creds.clientId && creds.clientSecret) {
    const { access_token } = await refreshAccessToken(
      creds.clientId,
      creds.clientSecret,
      creds.refreshToken
    );
    return access_token;
  }
  if (creds.accessToken) return creds.accessToken;
  throw new Error('No valid Google Calendar credentials. Please re-connect.');
}

function calHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

/** Verify credentials and return user profile. */
async function verifyCredentials(creds) {
  const accessToken = await getAccessToken(creds);
  const res = await fetch(`${CALENDAR_API}/users/me/calendarList?maxResults=10`, {
    headers: calHeaders(accessToken),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Calendar auth failed (${res.status})`);
  }
  const data = await res.json();
  return { email: data.items?.[0]?.summary || 'unknown', calendars: data.items?.length || 0 };
}

/** List available calendars. */
async function listCalendars(creds) {
  const accessToken = await getAccessToken(creds);
  const res = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
    headers: calHeaders(accessToken),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Failed to list calendars (${res.status})`);
  const data = await res.json();
  return (data.items || []).map(c => ({
    id: c.id,
    summary: c.summary,
    primary: c.primary || false,
    accessRole: c.accessRole,
  }));
}

/**
 * Push a Taskara task with a dueDate → Google Calendar event.
 * Returns the created event ID.
 */
async function pushTaskToCalendar(creds, task, calendarId = 'primary') {
  const accessToken = await getAccessToken(creds);

  const due = task.dueDate ? new Date(task.dueDate) : null;
  if (!due) throw new Error('Task has no due date to sync');

  const event = {
    summary: task.title,
    description: task.description || '',
    start: { date: due.toISOString().slice(0, 10) },
    end:   { date: due.toISOString().slice(0, 10) },
    source: {
      title: 'Taskara',
      url:   'https://taskara.app',
    },
    extendedProperties: {
      private: { taskaraTaskId: task._id.toString() },
    },
  };

  const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: calHeaders(accessToken),
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create calendar event (${res.status})`);
  }

  const data = await res.json();
  return { eventId: data.id, htmlLink: data.htmlLink };
}

/**
 * Pull upcoming calendar events → create Taskara reminders.
 * Returns array of imported event summaries.
 */
async function pullCalendarEvents(creds, userId, workspaceId, calendarId = 'primary', days = 7) {
  const Reminder = require('../../models/Reminder');
  const accessToken = await getAccessToken(creds);

  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + days * 86400000).toISOString();

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events` +
    `?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=50`,
    { headers: calHeaders(accessToken), signal: AbortSignal.timeout(15000) }
  );

  if (!res.ok) throw new Error(`Failed to fetch calendar events (${res.status})`);
  const data = await res.json();

  let imported = 0;
  for (const ev of data.items || []) {
    const startDate = ev.start?.dateTime || ev.start?.date;
    if (!startDate) continue;

    // Skip events that were pushed FROM Taskara
    if (ev.extendedProperties?.private?.taskaraTaskId) continue;

    const existing = await Reminder.findOne({
      userId,
      workspaceId,
      'meta.googleEventId': ev.id,
    });
    if (existing) continue;

    await Reminder.create({
      userId,
      workspaceId,
      title: ev.summary || 'Google Calendar Event',
      message: ev.description || '',
      remindAt: new Date(startDate),
      meta: { googleEventId: ev.id, googleCalendarId: calendarId },
    });
    imported++;
  }

  return { total: data.items?.length || 0, imported };
}

module.exports = { verifyCredentials, listCalendars, pushTaskToCalendar, pullCalendarEvents };
