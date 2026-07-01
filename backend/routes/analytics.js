const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Task = require('../models/Task');
const Idea = require('../models/Idea');
const Project = require('../models/Project');

const userId = 'default';

/** Returns a Date set to midnight (start of day) N days ago */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns a YYYY-MM-DD string from a Date */
function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

// GET / — full analytics snapshot
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = daysAgo(7);

    // ── Parallel aggregations ────────────────────────────────────────────────
    const [
      tasksCompleted,
      totalTasks,
      ideasCaptured,
      totalIdeas,
      activeProjects,
      allHabits,
      habitsCompletedToday,
      recentChats,
    ] = await Promise.all([
      // Tasks done in last 7 days
      Task.countDocuments({ userId, status: 'done', completedAt: { $gte: sevenDaysAgo } }),

      // All tasks
      Task.countDocuments({ userId }),

      // Ideas captured in last 7 days
      Idea.countDocuments({ userId, createdAt: { $gte: sevenDaysAgo } }),

      // Total ideas
      Idea.countDocuments({ userId }),

      // Active projects
      Project.countDocuments({ userId, status: 'active' }),

      // Total habits
      Task.countDocuments({ userId, isHabit: true }),

      // Habits completed today
      Task.countDocuments({
        userId,
        isHabit: true,
        status: 'done',
        completedAt: { $gte: daysAgo(0) }  // midnight today
      }),

      // Recent chats for session counting and daily breakdown
      Chat.find({ timestamp: { $gte: sevenDaysAgo } })
        .select('sessionId timestamp')
        .lean(),
    ]);

    // ── Chat session count (distinct sessionIds in last 7 days) ─────────────
    const distinctSessions = new Set(recentChats.map(c => c.sessionId)).size;

    // ── Productivity score (0-100) ───────────────────────────────────────────
    const taskScore   = Math.round((tasksCompleted / Math.max(totalTasks, 1)) * 40);
    const habitScore  = Math.round((habitsCompletedToday / Math.max(allHabits, 1)) * 30);
    const projectScore = activeProjects > 0 ? 30 : 0;
    const productivityScore = Math.min(100, taskScore + habitScore + projectScore);

    // ── Weekly activity breakdown (last 7 days) ──────────────────────────────
    // We need per-day counts for tasks, ideas, and chats — run in parallel
    const weeklyActivity = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const dayStart = daysAgo(6 - i); // index 0 = 6 days ago, index 6 = today
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        return Promise.all([
          Task.countDocuments({ userId, status: 'done', completedAt: { $gte: dayStart, $lte: dayEnd } }),
          Idea.countDocuments({ userId, createdAt: { $gte: dayStart, $lte: dayEnd } }),
        ]).then(([tc, ic]) => {
          // Count chats for this day from already-fetched data (avoids extra DB round-trips)
          const dayStr = toDateStr(dayStart);
          const chatsOnDay = recentChats.filter(c => toDateStr(new Date(c.timestamp)) === dayStr).length;
          return {
            date: dayStr,
            tasksCompleted: tc,
            ideasAdded: ic,
            chats: chatsOnDay
          };
        });
      })
    );

    res.json({
      tasksCompleted,
      totalTasks,
      ideasCaptured,
      totalIdeas,
      chatSessions: distinctSessions,
      activeProjects,
      productivityScore,
      weeklyActivity
    });
  } catch (err) {
    console.error('[Analytics] GET /', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
