const { Router } = require('express');
const bcrypt = require('bcrypt');
const db = require('./db.cjs');

const router = Router();

// Auth middleware — attach to routes that need login
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const result = await db.query(
      'SELECT id, username, display_name, first_name, last_name, email, password_hash, is_admin FROM users WHERE username = $1',
      [username]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.isAdmin = user.is_admin;
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      isAdmin: user.is_admin,
    });
  } catch (err) {
    console.error('[auth] Login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('podda.sid');
    res.json({ ok: true });
  });
});

// GET /api/auth/me
// Returns 200 with null when not authenticated (avoids browser console errors on initial load).
// 401 is reserved for protected endpoints via requireAuth middleware.
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.json(null);
  }

  try {
    const result = await db.query(
      'SELECT id, username, display_name, first_name, last_name, email, is_admin FROM users WHERE id = $1',
      [req.session.userId]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      isAdmin: user.is_admin,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { router, requireAuth };
