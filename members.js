// routes/members.js
const express = require('express');
const pool = require('../db');
const router = express.Router();

/**
 * 🔁 Helper function to update ministry and department member counts
 * Ensures data matches even if casing or whitespace differ
 */
async function updateCounts() {
  try {
    // ✅ Update ministry member counts
    await pool.query(`
      UPDATE ministries m
      LEFT JOIN (
        SELECT LOWER(TRIM(ministry)) AS ministry_name, COUNT(*) AS count
        FROM members
        WHERE ministry IS NOT NULL AND ministry != ''
        GROUP BY LOWER(TRIM(ministry))
      ) sub ON LOWER(TRIM(m.name)) = sub.ministry_name
      SET m.member_count = COALESCE(sub.count, 0)
    `);
    console.log('✅ Ministry member counts updated.');

    // ✅ Update department member counts
    await pool.query(`
      UPDATE departments d
      LEFT JOIN (
        SELECT LOWER(TRIM(department)) AS department_name, COUNT(*) AS count
        FROM members
        WHERE department IS NOT NULL AND department != ''
        GROUP BY LOWER(TRIM(department))
      ) sub ON LOWER(TRIM(d.name)) = sub.department_name
      SET d.member_count = COALESCE(sub.count, 0)
    `);
    console.log('✅ Department member counts updated.');
  } catch (err) {
    console.error('❌ Error updating ministry/department counts:', err.message);
  }
}

/**
 * ✅ Get all members
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM members ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching members:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Get a single member by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Member not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error fetching member:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Add a new member
 */
router.post('/', async (req, res) => {
  const { firstname, lastname, phone, gender, ministry, department, home_location, joined_at } = req.body;

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

    // 🔁 Refresh counts after insertion
    await updateCounts();

    const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
    res.status(201).json({
      message: '✅ Member added successfully',
      member: rows[0],
    });
  } catch (err) {
    console.error('❌ Error adding member:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Update existing member
 */
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

    // 🔁 Refresh counts after update
    await updateCounts();

    const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Member not found' });

    res.json({
      message: '✅ Member updated successfully',
      member: rows[0],
    });
  } catch (err) {
    console.error('❌ Error updating member:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Delete a member
 */
router.delete('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const [result] = await pool.query('DELETE FROM members WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // 🔁 Refresh counts after deletion
    await updateCounts();

    res.json({ message: '✅ Member deleted successfully', ok: true });
  } catch (err) {
    console.error('❌ Error deleting member:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
