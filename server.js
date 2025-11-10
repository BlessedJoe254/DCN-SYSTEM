// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise'); // async/await support
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

// Make the db available in all routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// ====== JWT SECRET ======
const SECRET = process.env.JWT_SECRET || 'church_secret_key';

// ====== Auth Routes ======

// ✅ Register (optional for first admin setup)
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashed, role || 'Admin']
    );
    res.json({ ok: true, message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ✅ Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
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

// ====== Routes ======
const membersRouter = require('./routes/members');
const contributionsRouter = require('./routes/contributions');
const expensesRouter = require('./routes/expenses');

// Protect main routes with verifyToken (optional — enable later)
app.use('/api/members', membersRouter);
app.use('/api/contributions', contributionsRouter);
app.use('/api/expenses', expensesRouter);

// Auth route (unprotected)
app.get('/api/auth/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// ====== Health Check ======
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Deliverance Church server is healthy!' });
});

// ====== Start Server ======
const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await initDB();
});
