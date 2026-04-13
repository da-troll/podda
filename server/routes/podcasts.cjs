const { Router } = require('express');
const RSSParser = require('rss-parser');
const db = require('../db.cjs');
const { parseDuration, fallbackGuid, fetchFeed } = require('../feed-utils.cjs');
const { requireAuth } = require('../auth.cjs');

const router = Router();
const parser = new RSSParser({
  customFields: {
    feed: [['itunes:author', 'itunesAuthor'], ['itunes:image', 'itunesImage'], ['itunes:new-feed-url', 'itunesNewFeedUrl']],
    item: [['itunes:duration', 'itunesDuration'], ['itunes:image', 'itunesImage'], ['itunes:episode', 'itunesEpisode']],
  },
});

const toHttps = (url) => url ? url.replace(/^http:\/\//, 'https://') : null;

// Upsert a podcast and its episodes from parsed feed data
async function upsertPodcastFromFeed(feedUrl, feed) {
  const artwork = toHttps(feed.itunesImage?.href || feed.itunesImage?.$ ?.href || feed.image?.url || null);

  // Upsert podcast
  const podResult = await db.query(`
    INSERT INTO podcasts (feed_url, title, author, description, artwork_url, link, language, last_fetched, last_build_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
    ON CONFLICT (feed_url) DO UPDATE SET
      title = EXCLUDED.title,
      author = EXCLUDED.author,
      description = EXCLUDED.description,
      artwork_url = EXCLUDED.artwork_url,
      link = EXCLUDED.link,
      language = EXCLUDED.language,
      last_fetched = NOW(),
      last_build_date = EXCLUDED.last_build_date,
      error_count = 0
    RETURNING id
  `, [
    feedUrl,
    feed.title || 'Untitled Podcast',
    feed.itunesAuthor || feed.creator || null,
    feed.description || null,
    artwork,
    feed.link || null,
    feed.language || null,
    feed.lastBuildDate ? new Date(feed.lastBuildDate) : null,
  ]);

  const podcastId = podResult.rows[0].id;

  // Upsert episodes
  const items = feed.items || [];
  let newCount = 0;

  for (const item of items) {
    if (!item.enclosure?.url) continue;

    const guid = item.guid || fallbackGuid(item);
    const epArtwork = toHttps(item.itunesImage?.href || item.itunesImage?.$?.href || null);

    try {
      const result = await db.query(`
        INSERT INTO episodes (podcast_id, guid, title, description, audio_url, audio_type, audio_length, duration, pub_date, artwork_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (podcast_id, guid) DO NOTHING
        RETURNING id
      `, [
        podcastId,
        guid,
        item.title || 'Untitled Episode',
        item.contentSnippet || item.content || null,
        item.enclosure.url,
        item.enclosure.type || 'audio/mpeg',
        item.enclosure.length ? parseInt(item.enclosure.length, 10) : null,
        parseDuration(item.itunesDuration || item.itunes?.duration),
        item.pubDate ? new Date(item.pubDate) : null,
        epArtwork,
      ]);
      if (result.rows.length > 0) newCount++;
    } catch (err) {
      console.error(`[podcasts] Episode upsert error (${guid}):`, err.message);
    }
  }

  return { podcastId, totalEpisodes: items.length, newEpisodes: newCount };
}

// GET /api/podcasts/by-feed?url=... — look up a subscribed podcast by feed URL
router.get('/by-feed', requireAuth, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const result = await db.query(
      `SELECT p.id FROM podcasts p
       JOIN subscriptions s ON s.podcast_id = p.id
       WHERE s.user_id = $1 AND p.feed_url = $2`,
      [req.session.userId, url]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'not found' });
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to lookup podcast' });
  }
});

// GET /api/podcasts — user's subscribed podcasts
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, s.subscribed_at,
        (SELECT COUNT(*) FROM episodes e WHERE e.podcast_id = p.id) AS episode_count,
        (SELECT COUNT(*) FROM episodes e
          JOIN listen_progress lp ON lp.episode_id = e.id AND lp.user_id = $1 AND lp.completed = true
          WHERE e.podcast_id = p.id
        ) AS completed_count
      FROM podcasts p
      JOIN subscriptions s ON s.podcast_id = p.id
      WHERE s.user_id = $1
      ORDER BY p.title ASC
    `, [req.session.userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('[podcasts] List error:', err.message);
    res.status(500).json({ error: 'Failed to fetch podcasts' });
  }
});

// POST /api/podcasts/subscribe — subscribe to a feed URL
router.post('/subscribe', requireAuth, async (req, res) => {
  const { feedUrl } = req.body;
  if (!feedUrl) return res.status(400).json({ error: 'feedUrl required' });

  try {
    const { xml, finalUrl, redirected } = await fetchFeed(feedUrl);
    const feed = await parser.parseString(xml);

    // Check for itunes:new-feed-url
    const canonicalUrl = feed.itunesNewFeedUrl || (redirected ? finalUrl : feedUrl);

    const { podcastId, newEpisodes } = await upsertPodcastFromFeed(canonicalUrl, feed);

    // If feed URL changed, update the stored URL
    if (canonicalUrl !== feedUrl) {
      await db.query('UPDATE podcasts SET feed_url = $1 WHERE id = $2', [canonicalUrl, podcastId]);
    }

    // Subscribe user
    await db.query(`
      INSERT INTO subscriptions (user_id, podcast_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, podcast_id) DO NOTHING
    `, [req.session.userId, podcastId]);

    const podcast = (await db.query('SELECT * FROM podcasts WHERE id = $1', [podcastId])).rows[0];
    res.json({ podcast, newEpisodes });
  } catch (err) {
    console.error('[podcasts] Subscribe error:', err.message);
    res.status(500).json({ error: `Failed to subscribe: ${err.message}` });
  }
});

// DELETE /api/podcasts/:id/unsubscribe
router.delete('/:id/unsubscribe', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM subscriptions WHERE user_id = $1 AND podcast_id = $2',
      [req.session.userId, parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// POST /api/podcasts/:id/refresh — force re-fetch
router.post('/:id/refresh', requireAuth, async (req, res) => {
  try {
    const podResult = await db.query('SELECT feed_url FROM podcasts WHERE id = $1', [parseInt(req.params.id)]);
    if (!podResult.rows[0]) return res.status(404).json({ error: 'Podcast not found' });

    const { xml, finalUrl, redirected } = await fetchFeed(podResult.rows[0].feed_url);
    const feed = await parser.parseString(xml);
    const canonicalUrl = feed.itunesNewFeedUrl || (redirected ? finalUrl : podResult.rows[0].feed_url);
    const result = await upsertPodcastFromFeed(canonicalUrl, feed);

    res.json(result);
  } catch (err) {
    console.error('[podcasts] Refresh error:', err.message);
    res.status(500).json({ error: `Refresh failed: ${err.message}` });
  }
});

// POST /api/podcasts/import-opml — bulk import from OPML XML
router.post('/import-opml', requireAuth, async (req, res) => {
  const { opml } = req.body;
  if (!opml) return res.status(400).json({ error: 'OPML XML required' });

  // Simple OPML parser — extract xmlUrl from outline elements
  const urlRegex = /xmlUrl=["']([^"']+)["']/gi;
  const urls = [];
  let match;
  while ((match = urlRegex.exec(opml)) !== null) {
    urls.push(match[1].replace(/&amp;/g, '&'));
  }

  if (urls.length === 0) {
    return res.status(400).json({ error: 'No feed URLs found in OPML' });
  }

  const results = { total: urls.length, success: 0, failed: 0, errors: [] };

  for (const url of urls) {
    try {
      const { xml, finalUrl, redirected } = await fetchFeed(url);
      const feed = await parser.parseString(xml);
      const canonicalUrl = feed.itunesNewFeedUrl || (redirected ? finalUrl : url);
      const { podcastId } = await upsertPodcastFromFeed(canonicalUrl, feed);

      await db.query(`
        INSERT INTO subscriptions (user_id, podcast_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, podcast_id) DO NOTHING
      `, [req.session.userId, podcastId]);

      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ url, error: err.message });
      console.error(`[opml] Failed to import ${url}:`, err.message);
    }
  }

  res.json(results);
});

module.exports = { router, upsertPodcastFromFeed };
