const { Router } = require('express');
const db = require('../db.cjs');
const { requireAuth } = require('../auth.cjs');

const router = Router();

// PUT /api/progress/:episodeId — upsert listen progress
router.put('/:episodeId', requireAuth, async (req, res) => {
  const episodeId = parseInt(req.params.episodeId);
  const { position, completed } = req.body;

  if (position == null && completed == null) {
    return res.status(400).json({ error: 'position or completed required' });
  }

  try {
    await db.query(`
      INSERT INTO listen_progress (user_id, episode_id, position, completed, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, episode_id) DO UPDATE SET
        position = COALESCE($3, listen_progress.position),
        completed = COALESCE($4, listen_progress.completed),
        updated_at = NOW()
    `, [req.session.userId, episodeId, position ?? 0, completed ?? false]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[progress] Save error:', err.message);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// GET /api/progress/in-progress — episodes with partial progress
router.get('/in-progress', requireAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.*,
        p.title AS podcast_title,
        p.artwork_url AS podcast_artwork_url,
        lp.position AS listen_position,
        lp.completed AS listen_completed,
        lp.updated_at AS progress_updated_at
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
