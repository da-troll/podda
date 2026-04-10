const { Router } = require('express');
const db = require('../db.cjs');
const { requireAuth } = require('../auth.cjs');

const router = Router();

// GET /api/playlists — list user's playlists with episode counts + total duration
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT pl.*,
        COALESCE(stats.episode_count, 0)::int AS episode_count,
        COALESCE(stats.total_duration, 0)::int AS total_duration
      FROM playlists pl
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS episode_count,
          SUM(COALESCE(e.duration, 0))::int AS total_duration
        FROM playlist_episodes pe
        JOIN episodes e ON e.id = pe.episode_id
        LEFT JOIN listen_progress lp ON lp.episode_id = pe.episode_id AND lp.user_id = pl.user_id
        WHERE pe.playlist_id = pl.id
          AND (pl.auto_remove_completed = false OR COALESCE(lp.completed, false) = false)
      ) stats ON true
      WHERE pl.user_id = $1
      ORDER BY pl.updated_at DESC
    `, [req.session.userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('[playlists] List error:', err.message);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// POST /api/playlists — create playlist
router.post('/', requireAuth, async (req, res) => {
  const { name, is_smart, rules, sort_order, auto_remove_completed } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const result = await db.query(`
      INSERT INTO playlists (user_id, name, is_smart, rules, sort_order, auto_remove_completed)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      req.session.userId,
      name.trim(),
      is_smart || false,
      rules ? JSON.stringify(rules) : null,
      sort_order || 'manual',
      auto_remove_completed !== false,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[playlists] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// PUT /api/playlists/:id — update playlist
router.put('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, rules, sort_order, auto_remove_completed } = req.body;

  try {
    const result = await db.query(`
      UPDATE playlists
      SET name = COALESCE($3, name),
          rules = COALESCE($4, rules),
          sort_order = COALESCE($5, sort_order),
          auto_remove_completed = COALESCE($6, auto_remove_completed),
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, req.session.userId, name?.trim() || null, rules ? JSON.stringify(rules) : null, sort_order || null, auto_remove_completed]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[playlists] Update error:', err.message);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// DELETE /api/playlists/:id — delete playlist
router.delete('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const result = await db.query(
      'DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[playlists] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// GET /api/playlists/:id/episodes — get episodes for a playlist
router.get('/:id/episodes', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    // Verify ownership and get playlist metadata
    const pl = await db.query(
      'SELECT * FROM playlists WHERE id = $1 AND user_id = $2',
      [id, req.session.userId]
    );
    if (pl.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const playlist = pl.rows[0];

    // Manual playlist: fetch from junction table
    let orderClause = 'pe.position ASC';
    if (playlist.sort_order === 'newest') orderClause = 'e.pub_date DESC NULLS LAST';
    else if (playlist.sort_order === 'oldest') orderClause = 'e.pub_date ASC NULLS LAST';
    else if (playlist.sort_order === 'shortest') orderClause = 'e.duration ASC NULLS LAST';
    else if (playlist.sort_order === 'longest') orderClause = 'e.duration DESC NULLS LAST';

    const completedFilter = playlist.auto_remove_completed
      ? 'AND COALESCE(lp.completed, false) = false'
      : '';

    const result = await db.query(`
      SELECT e.*,
        p.title AS podcast_title,
        p.artwork_url AS podcast_artwork_url,
        p.author AS podcast_author,
        lp.position AS listen_position,
        lp.completed AS listen_completed,
        lp.updated_at AS progress_updated_at,
        pe.position AS playlist_position
      FROM playlist_episodes pe
      JOIN episodes e ON e.id = pe.episode_id
      JOIN podcasts p ON p.id = e.podcast_id
      LEFT JOIN listen_progress lp ON lp.episode_id = e.id AND lp.user_id = $2
      WHERE pe.playlist_id = $1
        ${completedFilter}
      ORDER BY ${orderClause}
    `, [id, req.session.userId]);

    res.json({ playlist, episodes: result.rows });
  } catch (err) {
    console.error('[playlists] Episodes error:', err.message);
    res.status(500).json({ error: 'Failed to fetch playlist episodes' });
  }
});

// POST /api/playlists/:id/episodes — add episode(s) to manual playlist
router.post('/:id/episodes', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const { episode_ids } = req.body; // array of episode IDs

  if (!Array.isArray(episode_ids) || episode_ids.length === 0) {
    return res.status(400).json({ error: 'episode_ids array required' });
  }

  try {
    // Verify ownership + not smart
    const pl = await db.query(
      'SELECT id, is_smart FROM playlists WHERE id = $1 AND user_id = $2',
      [id, req.session.userId]
    );
    if (pl.rows.length === 0) return res.status(404).json({ error: 'Playlist not found' });
    if (pl.rows[0].is_smart) return res.status(400).json({ error: 'Cannot add episodes to smart playlists' });

    // Get current max position
    const maxPos = await db.query(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM playlist_episodes WHERE playlist_id = $1',
      [id]
    );
    let pos = maxPos.rows[0].max_pos + 1;

    const added = [];
    for (const epId of episode_ids) {
      try {
        await db.query(`
          INSERT INTO playlist_episodes (playlist_id, episode_id, position)
          VALUES ($1, $2, $3)
          ON CONFLICT (playlist_id, episode_id) DO NOTHING
        `, [id, epId, pos]);
        added.push(epId);
        pos++;
      } catch (e) {
        // skip invalid episode IDs
      }
    }

    // Touch playlist updated_at
    await db.query('UPDATE playlists SET updated_at = NOW() WHERE id = $1', [id]);

    res.json({ ok: true, added: added.length });
  } catch (err) {
    console.error('[playlists] Add episodes error:', err.message);
    res.status(500).json({ error: 'Failed to add episodes' });
  }
});

// DELETE /api/playlists/:id/episodes/:episodeId — remove episode from manual playlist
router.delete('/:id/episodes/:episodeId', requireAuth, async (req, res) => {
  const playlistId = parseInt(req.params.id);
  const episodeId = parseInt(req.params.episodeId);

  try {
    // Verify ownership
    const pl = await db.query(
      'SELECT id FROM playlists WHERE id = $1 AND user_id = $2',
      [playlistId, req.session.userId]
    );
    if (pl.rows.length === 0) return res.status(404).json({ error: 'Playlist not found' });

    await db.query(
      'DELETE FROM playlist_episodes WHERE playlist_id = $1 AND episode_id = $2',
      [playlistId, episodeId]
    );

    // Touch playlist updated_at
    await db.query('UPDATE playlists SET updated_at = NOW() WHERE id = $1', [playlistId]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[playlists] Remove episode error:', err.message);
    res.status(500).json({ error: 'Failed to remove episode' });
  }
});

// PUT /api/playlists/:id/reorder — reorder manual playlist
router.put('/:id/reorder', requireAuth, async (req, res) => {
  const playlistId = parseInt(req.params.id);
  const { episode_ids } = req.body; // ordered array of episode IDs

  if (!Array.isArray(episode_ids)) {
    return res.status(400).json({ error: 'episode_ids array required' });
  }

  try {
    // Verify ownership + not smart
    const pl = await db.query(
      'SELECT id, is_smart FROM playlists WHERE id = $1 AND user_id = $2',
      [playlistId, req.session.userId]
    );
    if (pl.rows.length === 0) return res.status(404).json({ error: 'Playlist not found' });
    if (pl.rows[0].is_smart) return res.status(400).json({ error: 'Cannot reorder smart playlists' });

    // Update positions in a transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < episode_ids.length; i++) {
        await client.query(
          'UPDATE playlist_episodes SET position = $1 WHERE playlist_id = $2 AND episode_id = $3',
          [i, playlistId, episode_ids[i]]
        );
      }
      await client.query('UPDATE playlists SET updated_at = NOW() WHERE id = $1', [playlistId]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[playlists] Reorder error:', err.message);
    res.status(500).json({ error: 'Failed to reorder playlist' });
  }
});

// POST /api/playlists/:id/queue — inject playlist episodes into queue (play next / play last)
router.post('/:id/queue', requireAuth, async (req, res) => {
  const playlistId = parseInt(req.params.id);
  const { mode } = req.body; // 'next' or 'last'

  if (!['next', 'last'].includes(mode)) {
    return res.status(400).json({ error: 'mode must be "next" or "last"' });
  }

  try {
    // Verify ownership
    const pl = await db.query(
      'SELECT * FROM playlists WHERE id = $1 AND user_id = $2',
      [playlistId, req.session.userId]
    );
    if (pl.rows.length === 0) return res.status(404).json({ error: 'Playlist not found' });

    const playlist = pl.rows[0];

    // Get playlist episodes (respecting sort order and auto_remove_completed)
    let orderClause = 'pe.position ASC';
    if (playlist.sort_order === 'newest') orderClause = 'e.pub_date DESC NULLS LAST';
    else if (playlist.sort_order === 'oldest') orderClause = 'e.pub_date ASC NULLS LAST';
    else if (playlist.sort_order === 'shortest') orderClause = 'e.duration ASC NULLS LAST';
    else if (playlist.sort_order === 'longest') orderClause = 'e.duration DESC NULLS LAST';

    const completedFilter = playlist.auto_remove_completed
      ? 'AND COALESCE(lp.completed, false) = false'
      : '';

    const episodes = await db.query(`
      SELECT pe.episode_id
      FROM playlist_episodes pe
      JOIN episodes e ON e.id = pe.episode_id
      LEFT JOIN listen_progress lp ON lp.episode_id = e.id AND lp.user_id = $2
      WHERE pe.playlist_id = $1
        ${completedFilter}
      ORDER BY ${orderClause}
    `, [playlistId, req.session.userId]);

    if (episodes.rows.length === 0) {
      return res.json({ ok: true, added: 0 });
    }

    const episodeIds = episodes.rows.map(r => r.episode_id);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      if (mode === 'last') {
        // Append to end of queue
        const maxPos = await client.query(
          'SELECT COALESCE(MAX(position), -1) AS max_pos FROM queue WHERE user_id = $1',
          [req.session.userId]
        );
        let pos = maxPos.rows[0].max_pos + 1;
        for (const epId of episodeIds) {
          await client.query(`
            INSERT INTO queue (user_id, episode_id, position)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, episode_id) DO NOTHING
          `, [req.session.userId, epId, pos]);
          pos++;
        }
      } else {
        // Play next: insert after position 0 (currently playing), shift others down
        // First, shift all existing queue items down by the number of new episodes
        await client.query(`
          UPDATE queue SET position = position + $2
          WHERE user_id = $1 AND position > 0
        `, [req.session.userId, episodeIds.length]);

        // Insert new episodes starting at position 1
        for (let i = 0; i < episodeIds.length; i++) {
          await client.query(`
            INSERT INTO queue (user_id, episode_id, position)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, episode_id) DO UPDATE SET position = $3
          `, [req.session.userId, episodeIds[i], i + 1]);
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ ok: true, added: episodeIds.length });
  } catch (err) {
    console.error('[playlists] Queue inject error:', err.message);
    res.status(500).json({ error: 'Failed to add to queue' });
  }
});

module.exports = router;
