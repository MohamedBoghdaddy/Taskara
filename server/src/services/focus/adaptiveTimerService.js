/**
 * Adaptive Pomodoro Timer Service.
 * Analyzes user's historical session data to recommend optimal session lengths.
 */
const PomodoroSession = require('../../models/PomodoroSession');
const HabitEntry      = require('../../models/HabitEntry');

/**
 * Compute the user's optimal session length based on completed sessions.
 * Returns recommended work/break durations and best working hours.
 */
const getAdaptiveRecommendations = async (userId, workspaceId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sessions = await PomodoroSession.find({
    userId, workspaceId,
    status: 'completed',
    type: 'focus',
    startedAt: { $gte: thirtyDaysAgo },
  }).sort({ startedAt: -1 }).limit(100);

  if (sessions.length < 3) {
    return {
      recommendedWork:       25,
      recommendedShortBreak: 5,
      recommendedLongBreak:  15,
      bestHours:             [9, 10, 14, 15],
      avgActualMinutes:      25,
      completionRate:        null,
      confidence:            'low',
      insight:               'Keep completing sessions to get personalized recommendations.',
    };
  }

  // Average actual session length of completed sessions
  const actualMinutes = sessions.map(s => s.actualMinutes || s.plannedMinutes || 25);
  const avgActual     = actualMinutes.reduce((s, v) => s + v, 0) / actualMinutes.length;

  // Completion rate (completed vs interrupted)
  const allRecent = await PomodoroSession.countDocuments({
    userId, workspaceId, startedAt: { $gte: thirtyDaysAgo }, type: 'focus',
  });
  const completionRate = sessions.length / Math.max(allRecent, 1);

  // Best working hours
  const hourCounts = {};
  for (const s of sessions) {
    const h = new Date(s.startedAt).getHours();
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  }
  const bestHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([h]) => parseInt(h))
    .sort((a, b) => a - b);

  // Optimal work duration: if completion rate < 70%, suggest shorter sessions
  let recommendedWork = Math.round(avgActual);
  if (completionRate < 0.7) recommendedWork = Math.max(15, recommendedWork - 5);
  if (completionRate > 0.9 && avgActual >= 25) recommendedWork = Math.min(50, recommendedWork + 5);
  recommendedWork = Math.round(recommendedWork / 5) * 5; // round to nearest 5

  const recommendedShortBreak = recommendedWork >= 40 ? 10 : 5;
  const recommendedLongBreak  = recommendedWork >= 40 ? 20 : 15;

  const currentHour = new Date().getHours();
  const isGoodTime  = bestHours.includes(currentHour) || bestHours.includes(currentHour - 1);

  let insight = '';
  if (completionRate < 0.6) insight = 'You interrupt sessions often. Try shorter 15-20 min sessions to build consistency.';
  else if (completionRate > 0.9 && avgActual >= 25) insight = `Great consistency! You can push to ${recommendedWork}-minute sessions.`;
  else if (isGoodTime) insight = `This is one of your peak focus hours (${currentHour}:00). Great time to start!`;
  else if (bestHours.length) insight = `Your best focus hours are ${bestHours.map(h => `${h}:00`).join(', ')}.`;

  return {
    recommendedWork,
    recommendedShortBreak,
    recommendedLongBreak,
    bestHours,
    avgActualMinutes: Math.round(avgActual),
    completionRate:   Math.round(completionRate * 100),
    confidence:       sessions.length >= 20 ? 'high' : sessions.length >= 10 ? 'medium' : 'low',
    insight,
    isGoodTime,
    sessionsAnalyzed: sessions.length,
  };
};

/**
 * Predict best working times for tomorrow based on historical patterns.
 */
const predictBestTimes = async (userId, workspaceId) => {
  const sessions = await PomodoroSession.find({
    userId, workspaceId, status: 'completed', type: 'focus',
  }).sort({ startedAt: -1 }).limit(200);

  const dayHourMap = {}; // { 'Mon-9': count }
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  for (const s of sessions) {
    const d = new Date(s.startedAt);
    const key = `${days[d.getDay()]}-${d.getHours()}`;
    dayHourMap[key] = (dayHourMap[key] || 0) + 1;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayName = days[tomorrow.getDay()];

  const tomorrowSlots = Object.entries(dayHourMap)
    .filter(([k]) => k.startsWith(dayName))
    .map(([k, count]) => ({ hour: parseInt(k.split('-')[1]), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return { day: dayName, slots: tomorrowSlots };
};

module.exports = { getAdaptiveRecommendations, predictBestTimes };
