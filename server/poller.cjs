const RSSParser = require('rss-parser');
const db = require('./db.cjs');
const { fetchFeed, parseDuration, fallbackGuid } = require('./feed-utils.cjs');
const { upsertPodcastFromFeed } = require('./routes/podcasts.cjs');

const parser = new RSSParser({
  customFields: {
    feed: [['itunes:author', 'itunesAuthor'], ['itunes:image', 'itunesImage'], ['itunes:new-feed-url', 'itunesNewFeedUrl']],
    item: [['itunes:duration', 'itunesDuration'], ['itunes:image', 'itunesImage']],
  },
});

async function pollFeeds() {
  try {
    const result = await db.query(`
      SELECT id, feed_url, error_count FROM podcasts
      WHERE last_fetched IS NULL OR last_fetched < NOW() - INTERVAL '25 minutes'
      ORDER BY last_fetched ASC NULLS FIRST
    `);

    const feeds = result.rows;
    if (feeds.length === 0) return;

    console.log(`[poller] Checking ${feeds.length} feeds...`);

    for (const feed of feeds) {
      // Skip feeds with too many consecutive errors (backoff)
      if (feed.error_count >= 5) {
        // Only retry every 10th cycle for broken feeds
        const rand = Math.random();
        if (rand > 0.1) continue;
      }

      try {
        const { xml, finalUrl, redirected } = await fetchFeed(feed.feed_url);
        const parsed = await parser.parseString(xml);
        const canonicalUrl = parsed.itunesNewFeedUrl || (redirected ? finalUrl : feed.feed_url);
        await upsertPodcastFromFeed(canonicalUrl, parsed);

        // Update feed URL if it changed
        if (canonicalUrl !== feed.feed_url) {
          await db.query('UPDATE podcasts SET feed_url = $1 WHERE id = $2', [canonicalUrl, feed.id]);
          console.log(`[poller] Feed URL updated: ${feed.feed_url} -> ${canonicalUrl}`);
        }
      } catch (err) {
        console.error(`[poller] Failed to fetch ${feed.feed_url}:`, err.message);
        await db.query(
          'UPDATE podcasts SET error_count = error_count + 1, last_fetched = NOW() WHERE id = $1',
          [feed.id]
        );
      }

      // Stagger: wait 1 second between feeds
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`[poller] Done checking ${feeds.length} feeds`);
  } catch (err) {
    console.error('[poller] Poll cycle error:', err.message);
  }
}

module.exports = { pollFeeds };
