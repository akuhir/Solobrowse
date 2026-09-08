const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
// Body: { matricNo, password }
router.post('/login', async (req, res) => {
    try {
        const { matricNo, password } = req.body || {};

        if (!matricNo || !password) {
            return res.status(400).json({ success: false, message: 'Matric number and password are required.' });
        }

        const result = await pool.query(
            'SELECT id, name, matric_no, password_hash, department, role, is_active FROM users WHERE matric_no = $1',
            [matricNo.trim().toUpperCase()]
        );

        // Generic message for both "not found" and "wrong password" —
        // don't reveal which part was wrong.
        const genericError = { success: false, message: 'Invalid matric number or password.' };

        if (result.rows.length === 0) {
            return res.status(401).json(genericError);
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(401).json({ success: false, message: 'This account has been deactivated.' });
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatches) {
            return res.status(401).json(genericError);
        }

        const token = jwt.sign(
            {
                id: user.id,
                name: user.name,
                matricNo: user.matric_no,
                department: user.department,
                role: user.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                matricNo: user.matric_no,
                department: user.department,
                role: user.role,
            },
        });
    } catch (err) {
        console.error('Login error:', err.message);
        return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }
});

// POST /api/auth/logout
// JWTs are stateless, so logout is handled client-side by discarding the
// token. This endpoint exists for API completeness / future session-based
// migration and simply confirms the request.
router.post('/logout', requireAuth, (req, res) => {
    res.json({ success: true, message: 'Logged out.' });
});

module.exports = router;
