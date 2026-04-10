const { Router } = require('express');
const { requireAuth } = require('../auth.cjs');

const router = Router();

// GET /api/search?q=term — proxy to iTunes Search API
router.get('/', requireAuth, async (req, res) => {
  const q = req.query.q;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Search query too short' });
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=podcast&limit=20`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    const data = await response.json();

    const results = (data.results || []).map(r => ({
      name: r.collectionName,
      artist: r.artistName,
      artworkUrl: r.artworkUrl600 || r.artworkUrl100,
      feedUrl: r.feedUrl,
      genre: r.primaryGenreName,
      trackCount: r.trackCount,
    })).filter(r => r.feedUrl); // only include podcasts with RSS feeds

    res.json(results);
  } catch (err) {
    console.error('[search] iTunes error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
