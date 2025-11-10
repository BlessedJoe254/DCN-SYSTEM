// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs'); // for password hashing
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, password, adminCode } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required.' });

  try {
    const [existing] = await req.db.execute('SELECT id FROM users WHERE username=?', [username]);
    if (existing.length)
      return res.status(400).json({ error: 'User already exists.' });

    let role = 'user';
    if (adminCode) {
      if (adminCode === '38484692') role = 'admin';
      else return res.status(400).json({ error: 'Invalid admin code.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await req.db.execute('INSERT INTO users (username, password, role) VALUES (?,?,?)', [username, hashed, role]);

    res.json({ message: 'Registration successful!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required.' });

  try {
    const [rows] = await req.db.execute('SELECT * FROM users WHERE username=?', [username]);
    if (!rows.length) return res.status(400).json({ error: 'User not found.' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Incorrect password.' });

    res.json({
      message: 'Login successful!',
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
