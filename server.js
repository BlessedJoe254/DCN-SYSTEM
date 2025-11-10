// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// ====== Middleware ======
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ====== Serve Client (Frontend) ======
app.use(express.static(path.join(__dirname, 'client')));

// ====== Database Connection ======
let db;

async function initDB() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'blessed_Joe123',
      database: process.env.DB_NAME || 'deliverance_db',
    });
    console.log('✅ Connected to MySQL Database');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

// Make DB available to all routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// ====== JWT SECRET ======
const SECRET = process.env.JWT_SECRET || 'church_secret_key';

// ====== AUTH ROUTES ======

// ✅ Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password, adminCode } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required.' });

  try {
    const [existing] = await db.execute('SELECT id FROM users WHERE username=?', [username]);
    if (existing.length)
      return res.status(400).json({ error: 'User already exists.' });

    let role = 'user';
    if (adminCode) {
      if (adminCode === '38484692') role = 'admin';
      else return res.status(400).json({ error: 'Invalid admin code.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.execute('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashed, role]);

    res.json({ message: 'Registration successful!' });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ✅ Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required.' });

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE username=?', [username]);
    if (!rows.length) return res.status(400).json({ error: 'User not found.' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Incorrect password.' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ✅ Middleware: Verify Token
function verifyToken(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token provided' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// ====== MEMBERS ROUTE (inline version for simplicity) ======
app.get('/api/members', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM members ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

app.post('/api/members', verifyToken, async (req, res) => {
  const { name, gender, ministry, joined_date } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const [result] = await db.execute(
      'INSERT INTO members (name, gender, ministry, joined_date) VALUES (?, ?, ?, ?)',
      [name, gender, ministry, joined_date]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// ====== CONTRIBUTIONS & EXPENSES ROUTES ======
const contributionsRouter = require('./routes/contributions');
const expensesRouter = require('./routes/expenses');
app.use('/api/contributions', verifyToken, contributionsRouter);
app.use('/api/expenses', verifyToken, expensesRouter);

// ====== Auth Me (verify current user) ======
app.get('/api/auth/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// ====== Health Check ======
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Deliverance Church server is healthy!' });
});

// ====== Catch-all to serve frontend ======
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// ====== Start Server ======
const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  await initDB();
  console.log(`🚀 Server running on port ${PORT}`);
});
