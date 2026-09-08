const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/:department/person-of-week
// Public. Returns null fields if nothing has been published yet — the
// frontend keeps its own hardcoded fallback for that case.
router.get('/:department/person-of-week', async (req, res) => {
    try {
        const { department } = req.params;
        const result = await pool.query(
            'SELECT name, description, photo_url, updated_at FROM person_of_week WHERE department = $1',
            [department]
        );
        if (result.rows.length === 0) {
            return res.json({ success: true, data: null });
        }
        return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Get person-of-week error:', err.message);
        return res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
});

// GET /api/:department/quote-of-week
router.get('/:department/quote-of-week', async (req, res) => {
    try {
        const { department } = req.params;
        const result = await pool.query(
            'SELECT quote_text, quote_author, updated_at FROM quote_of_week WHERE department = $1',
            [department]
        );
        if (result.rows.length === 0) {
            return res.json({ success: true, data: null });
        }
        return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Get quote-of-week error:', err.message);
        return res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
});

module.exports = router;
