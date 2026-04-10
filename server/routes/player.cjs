const { Router } = require('express');
const db = require('../db.cjs');
const { requireAuth } = require('../auth.cjs');

const router = Router();

// Hybrid completion threshold:
// Complete when <= 5 min remaining OR >= 98% played
function isCompleted(position, duration) {
  if (!duration || duration <= 0) return false;
  const remaining = duration - position;
  return remaining <= 300 || (position / duration) >= 0.98;
}

// PUT /api/progress/:episodeId — upsert listen progress
router.put('/:episodeId', requireAuth, async (req, res) => {
  const episodeId = parseInt(req.params.episodeId);
  const { position, completed, isNewSession } = req.body;

  if (position == null && completed == null) {
    return res.status(400).json({ error: 'position or completed required' });
  }

  try {
    // Get episode duration for auto-completion check
    const ep = await db.query('SELECT duration FROM episodes WHERE id = $1', [episodeId]);
    const duration = ep.rows[0]?.duration || 0;

    const pos = position ?? 0;
    // Auto-complete via hybrid threshold, or accept explicit completed flag
    const isComplete = completed === true || isCompleted(pos, duration);

    // Check if this is a re-listen (was completed, now playing again)
    const existing = await db.query(
      'SELECT completed, play_count FROM listen_progress WHERE user_id = $1 AND episode_id = $2',
      [req.session.userId, episodeId]
    );
    const wasCompleted = existing.rows[0]?.completed === true;
    const currentPlayCount = existing.rows[0]?.play_count || 0;

    // If re-listening a completed episode at a low position, reset completion
    const resetCompletion = wasCompleted && !isComplete && pos < (duration * 0.1);

    // Increment play_count on new session start
    const newPlayCount = isNewSession ? currentPlayCount + 1 : currentPlayCount;

    await db.query(`
      INSERT INTO listen_progress (user_id, episode_id, position, completed, updated_at, played_at, play_count, completed_at)
      VALUES ($1, $2, $3, $4, NOW(), ${isNewSession ? 'NOW()' : 'NULL'}, $5, ${isComplete ? 'NOW()' : 'NULL'})
      ON CONFLICT (user_id, episode_id) DO UPDATE SET
        position = $3,
        completed = $4,
        updated_at = NOW(),
        played_at = ${isNewSession ? 'NOW()' : 'listen_progress.played_at'},
        play_count = $5,
        completed_at = CASE
          WHEN $4 = true AND listen_progress.completed_at IS NULL THEN NOW()
          WHEN $4 = false THEN NULL
          ELSE listen_progress.completed_at
        END
    `, [req.session.userId, episodeId, pos, resetCompletion ? false : isComplete, newPlayCount]);

    // If auto-completed, also remove from queue
    if (isComplete) {
      await db.query(
        'DELETE FROM queue WHERE user_id = $1 AND episode_id = $2',
        [req.session.userId, episodeId]
      );
    }

    res.json({ ok: true, completed: resetCompletion ? false : isComplete });
  } catch (err) {
    console.error('[progress] Save error:', err.message);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// GET /api/progress/in-progress — episodes with partial progress (includes updated_at for smart rewind)
router.get('/in-progress', requireAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.*,
        p.title AS podcast_title,
        p.artwork_url AS podcast_artwork_url,
        lp.position AS listen_position,
        lp.completed AS listen_completed,
        lp.updated_at AS progress_updated_at,
        lp.play_count
      FROM listen_progress lp
      JOIN episodes e ON e.id = lp.episode_id
      JOIN podcasts p ON p.id = e.podcast_id
      WHERE lp.user_id = $1 AND lp.completed = false AND lp.position > 0
      ORDER BY lp.updated_at DESC
      LIMIT 20
    `, [req.session.userId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch in-progress episodes' });
  }
});

module.exports = router;
