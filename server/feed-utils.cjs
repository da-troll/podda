const crypto = require('crypto');

// Parse iTunes duration (HH:MM:SS, MM:SS, or raw seconds) to integer seconds
function parseDuration(raw) {
  if (!raw) return null;
  const str = String(raw).trim();

  // Already seconds
  if (/^\d+$/.test(str)) return parseInt(str, 10);

  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return null;

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

// Generate a deterministic GUID fallback when <guid> is missing
function fallbackGuid(item) {
  const source = item.enclosure?.url || `${item.pubDate || ''}|${item.title || ''}`;
  return 'gen-' + crypto.createHash('sha256').update(source).digest('hex').slice(0, 16);
}

// Fetch RSS with timeout and redirect handling
async function fetchFeed(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'PappaPod/1.0 (podcast aggregator)',
      },
    });

    const finalUrl = res.url; // after redirects
    const xml = await res.text();
    return { xml, finalUrl, redirected: finalUrl !== url };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { parseDuration, fallbackGuid, fetchFeed };
