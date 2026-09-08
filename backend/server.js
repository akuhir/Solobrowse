require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const departmentRoutes = require('./src/routes/department');
const adminRoutes = require('./src/routes/admin');
const { requireAuth } = require('./src/middleware/auth');

if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set.');
    process.exit(1);
}

const app = express();

// --- CORS: restricted to the actual GitHub Pages frontend origin(s) ---
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow non-browser tools (curl, server-to-server) with no Origin header.
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    })
);

app.use(express.json({ limit: '1mb' }));

// Serve locally-stored photos when Cloudinary isn't configured (dev fallback).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.get('/api/me', requireAuth, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            name: req.user.name,
            matricNo: req.user.matricNo,
            department: req.user.department,
            role: req.user.role,
        },
    });
});
app.use('/api', departmentRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Not found.' });
});

// Generic error handler — never leak stack traces to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ success: false, message: 'Something went wrong.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`AKUM Portal backend listening on port ${PORT}`);
});
