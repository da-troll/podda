const { Router } = require('express');
const db = require('../db.cjs');
const { requireAuth } = require('../auth.cjs');

const router = Router();

// POST /api/feedback
router.post('/', requireAuth, async (req, res) => {
  const { topic, details } = req.body;
  if (!topic?.trim() || !details?.trim()) {
    return res.status(400).json({ error: 'topic and details are required' });
  }

  try {
    await db.query(
      'INSERT INTO feedback (user_id, topic, details) VALUES ($1, $2, $3)',
      [req.session.userId, topic.trim(), details.trim()]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[feedback] Submit error:', err.message);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

module.exports = router;
