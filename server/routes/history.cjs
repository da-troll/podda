const { Router } = require('express');
const db = require('../db.cjs');
const { requireAuth } = require('../auth.cjs');

const router = Router();

// GET /api/history — full listening history (reverse chronological)
router.get('/', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const filter = req.query.filter; // 'completed' or 'in-progress'

  let where = 'lp.user_id = $1 AND lp.position > 0';
  if (filter === 'completed') where += ' AND lp.completed = true';
  else if (filter === 'in-progress') where += ' AND lp.completed = false';

  try {
    const result = await db.query(`
      SELECT e.*,
        p.title AS podcast_title,
        p.artwork_url AS podcast_artwork_url,
        p.author AS podcast_author,
        lp.position AS listen_position,
        lp.completed AS listen_completed,
        lp.updated_at AS progress_updated_at,
        lp.played_at,
        lp.play_count,
        lp.completed_at
      FROM listen_progress lp
      JOIN episodes e ON e.id = lp.episode_id
      JOIN podcasts p ON p.id = e.podcast_id
      WHERE ${where}
      ORDER BY lp.updated_at DESC
      LIMIT $2 OFFSET $3
    `, [req.session.userId, limit, offset]);

    res.json(result.rows);
  } catch (err) {
    console.error('[history] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// POST /api/history/:episodeId/mark-played — manual mark as completed
router.post('/:episodeId/mark-played', requireAuth, async (req, res) => {
  const episodeId = parseInt(req.params.episodeId);

  try {
    // Get episode duration for position
    const ep = await db.query('SELECT duration FROM episodes WHERE id = $1', [episodeId]);
    const duration = ep.rows[0]?.duration || 0;

    await db.query('BEGIN');

    // Upsert listen_progress as completed
    await db.query(`
      INSERT INTO listen_progress (user_id, episode_id, position, completed, completed_at, updated_at)
      VALUES ($1, $2, $3, true, NOW(), NOW())
      ON CONFLICT (user_id, episode_id) DO UPDATE SET
        completed = true,
        completed_at = COALESCE(listen_progress.completed_at, NOW()),
        updated_at = NOW()
    `, [req.session.userId, episodeId, duration]);

    // Remove from queue if present
    await db.query(
      'DELETE FROM queue WHERE user_id = $1 AND episode_id = $2',
      [req.session.userId, episodeId]
    );

    await db.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('[history] mark-played error:', err.message);
    res.status(500).json({ error: 'Failed to mark as played' });
  }
});

// POST /api/history/:episodeId/mark-unplayed — reset progress
router.post('/:episodeId/mark-unplayed', requireAuth, async (req, res) => {
  const episodeId = parseInt(req.params.episodeId);

  try {
    await db.query(`
      UPDATE listen_progress
      SET position = 0, completed = false, completed_at = NULL, updated_at = NOW()
      WHERE user_id = $1 AND episode_id = $2
    `, [req.session.userId, episodeId]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[history] mark-unplayed error:', err.message);
    res.status(500).json({ error: 'Failed to mark as unplayed' });
  }
});

module.exports = router;
