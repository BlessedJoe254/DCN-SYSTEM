// routes/members.js
const express = require('express');
const pool = require('../db');
const router = express.Router();

// Get all members
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM members ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get member by ID
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new member
router.post('/', async (req, res) => {
  const { firstname, lastname, phone, gender, ministry, department, home_location, joined_at } = req.body;

  // validate required fields
  if (!firstname || !phone || !gender || !ministry || !department) {
    return res.status(400).json({
      error: 'Missing required fields: firstname, phone, gender, ministry, department',
    });
  }

  const joinDate = joined_at || new Date().toISOString().split('T')[0];

  try {
    const [result] = await pool.query(
      `INSERT INTO members 
        (firstname, lastname, phone, gender, ministry, department, home_location, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [firstname, lastname || '', phone, gender, ministry, department, home_location || '', joinDate]
    );

    const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
    res.status(201).json({
      message: 'Member added successfully',
      member: rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update member
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { firstname, lastname, phone, gender, ministry, department, home_location, joined_at } = req.body;

  try {
    await pool.query(
      `UPDATE members 
       SET firstname=?, lastname=?, phone=?, gender=?, ministry=?, department=?, home_location=?, joined_at=? 
       WHERE id=?`,
      [firstname, lastname, phone, gender, ministry, department, home_location, joined_at, id]
    );

    const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
    res.json({
      message: 'Member updated successfully',
      member: rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete member
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM members WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ message: 'Member deleted successfully', ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
