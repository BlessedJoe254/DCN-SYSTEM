// routes/expenses.js
const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM expenses ORDER BY created_at DESC');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { title, amount, note } = req.body;
  const [result] = await pool.query('INSERT INTO expenses (title, amount, note) VALUES (?, ?, ?)', [title, amount, note]);
  const [rows] = await pool.query('SELECT * FROM expenses WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

module.exports = router;
