const { Pool } = require('pg');

const pool = new Pool();

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Session table (connect-pg-simple)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" VARCHAR NOT NULL COLLATE "default",
        "sess" JSON NOT NULL,
        "expire" TIMESTAMPTZ(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    // Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Podcasts (shared across users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS podcasts (
        id SERIAL PRIMARY KEY,
        feed_url TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        description TEXT,
        artwork_url TEXT,
        link TEXT,
        language VARCHAR(10),
        last_fetched TIMESTAMPTZ,
        last_build_date TIMESTAMPTZ,
        error_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Episodes
    await client.query(`
      CREATE TABLE IF NOT EXISTS episodes (
        id SERIAL PRIMARY KEY,
        podcast_id INTEGER NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
        guid TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        audio_url TEXT NOT NULL,
        audio_type VARCHAR(50),
        audio_length BIGINT,
        duration INTEGER,
        pub_date TIMESTAMPTZ,
        artwork_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(podcast_id, guid)
      );
      CREATE INDEX IF NOT EXISTS idx_episodes_podcast_pubdate ON episodes(podcast_id, pub_date DESC);
    `);

    // Subscriptions (user <-> podcast)
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        podcast_id INTEGER NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
        subscribed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, podcast_id)
      );
    `);

    // Listen progress (per user per episode)
    await client.query(`
      CREATE TABLE IF NOT EXISTS listen_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        played_at TIMESTAMPTZ,
        play_count INTEGER DEFAULT 0,
        completed_at TIMESTAMPTZ,
        UNIQUE(user_id, episode_id)
      );
      CREATE INDEX IF NOT EXISTS idx_progress_user ON listen_progress(user_id);
    `);

    // Play queue (ordered per user)
    await client.query(`
      CREATE TABLE IF NOT EXISTS queue (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        added_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, episode_id)
      );
      CREATE INDEX IF NOT EXISTS idx_queue_user_position ON queue(user_id, position);
    `);

    await client.query('COMMIT');
    console.log('[pappapod] Database schema initialized');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[pappapod] Database init failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  initDB,
};
