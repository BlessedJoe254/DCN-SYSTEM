// routes/contributions.js
const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT c.*, m.firstname, m.lastname FROM contributions c LEFT JOIN members m ON c.member_id = m.id ORDER BY c.created_at DESC');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { member_id, amount, method, note } = req.body;
  const [result] = await pool.query('INSERT INTO contributions (member_id, amount, method, note) VALUES (?, ?, ?, ?)', [member_id || null, amount, method, note]);
  const [rows] = await pool.query('SELECT * FROM contributions WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

module.exports = router;
