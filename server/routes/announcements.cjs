const { Router } = require('express');
const db = require('../db.cjs');
const { requireAuth, requireAdmin } = require('../auth.cjs');

const router = Router();

const VALID_TYPES = ['info', 'warning', 'success'];

// GET /api/announcements — active, non-dismissed announcements for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.title, a.body, a.type, a.starts_at, a.expires_at, a.created_at
       FROM announcements a
       WHERE a.starts_at <= NOW()
         AND (a.expires_at IS NULL OR a.expires_at > NOW())
         AND a.id NOT IN (
           SELECT announcement_id FROM announcement_dismissals WHERE user_id = $1
         )
       ORDER BY a.created_at DESC`,
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[announcements] Fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// GET /api/announcements/all — all announcements (admin only, for management UI)
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.title, a.body, a.type, a.starts_at, a.expires_at, a.created_at,
              u.username AS created_by_username
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       ORDER BY a.created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[announcements] Fetch all error:', err.message);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /api/announcements — create announcement (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { title, body, type, expires_at } = req.body;

  if (!title?.trim() || title.trim().length > 200) {
    return res.status(400).json({ error: 'Title is required (max 200 characters)' });
  }
  if (body && body.length > 1000) {
    return res.status(400).json({ error: 'Body must be under 1000 characters' });
  }
  const announcementType = VALID_TYPES.includes(type) ? type : 'info';

  let expiresAt = null;
  if (expires_at) {
    const parsed = new Date(expires_at);
    if (isNaN(parsed.getTime()) || parsed <= new Date()) {
      return res.status(400).json({ error: 'expires_at must be a valid future date' });
    }
    expiresAt = parsed.toISOString();
  }

  // created_by is the session user if logged in, null for API key access
  const createdBy = req.session?.userId || null;

  try {
    const result = await db.query(
      `INSERT INTO announcements (title, body, type, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, body, type, starts_at, expires_at, created_at`,
      [title.trim(), body?.trim() || null, announcementType, expiresAt, createdBy]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[announcements] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// DELETE /api/announcements/:id — remove announcement (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid announcement ID' });

  try {
    const result = await db.query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[announcements] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// POST /api/announcements/:id/dismiss — dismiss for current user
router.post('/:id/dismiss', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid announcement ID' });

  try {
    await db.query(
      `INSERT INTO announcement_dismissals (user_id, announcement_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.session.userId, id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[announcements] Dismiss error:', err.message);
    res.status(500).json({ error: 'Failed to dismiss announcement' });
  }
});

module.exports = router;
