const express = require('express');
const multer = require('multer');
const pool = require('../db');
const { requireAuth, requireDepartmentAdmin } = require('../middleware/auth');
const { storePhoto, deletePhoto } = require('../utils/photoStorage');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error('Only image files (JPEG, PNG, WEBP, GIF) are allowed.'));
        }
        cb(null, true);
    },
});

function handleMulterError(err, req, res, next) {
    if (err instanceof multer.MulterError || err) {
        return res.status(400).json({ success: false, message: err.message || 'File upload failed.' });
    }
    next();
}

// All routes below require: authenticated + admin role + matching department.
// ---------------------------------------------------------------

// PUT /api/admin/:department/person-of-week   { name, description }
router.put('/:department/person-of-week', requireAuth, (req, res, next) => {
    requireDepartmentAdmin(req.params.department)(req, res, next);
}, async (req, res) => {
    try {
        const { department } = req.params;
        const { name, description } = req.body || {};

        if (name !== undefined && typeof name !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid name.' });
        }
        if (description !== undefined && typeof description !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid description.' });
        }
        if ((name && name.trim().length > 150)) {
            return res.status(400).json({ success: false, message: 'Name is too long (max 150 characters).' });
        }
        if ((description && description.trim().length > 3000)) {
            return res.status(400).json({ success: false, message: 'Description is too long (max 3000 characters).' });
        }

        const existing = await pool.query('SELECT * FROM person_of_week WHERE department = $1', [department]);

        let result;
        if (existing.rows.length === 0) {
            result = await pool.query(
                `INSERT INTO person_of_week (department, name, description, updated_by)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [department, name?.trim() ?? null, description?.trim() ?? null, req.user.id]
            );
        } else {
            result = await pool.query(
                `UPDATE person_of_week
                 SET name = COALESCE($1, name),
                     description = COALESCE($2, description),
                     updated_by = $3
                 WHERE department = $4
                 RETURNING *`,
                [name?.trim() ?? null, description?.trim() ?? null, req.user.id, department]
            );
        }

        return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Update person-of-week error:', err.message);
        return res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
});

// POST /api/admin/:department/person-of-week/photo   (multipart/form-data, field "photo")
router.post(
    '/:department/person-of-week/photo',
    requireAuth,
    (req, res, next) => requireDepartmentAdmin(req.params.department)(req, res, next),
    upload.single('photo'),
    handleMulterError,
    async (req, res) => {
        try {
            const { department } = req.params;
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No image file was uploaded.' });
            }

            const existing = await pool.query('SELECT photo_url FROM person_of_week WHERE department = $1', [department]);
            const oldUrl = existing.rows[0]?.photo_url;

            const newUrl = await storePhoto(req.file.buffer, department);

            let result;
            if (existing.rows.length === 0) {
                result = await pool.query(
                    `INSERT INTO person_of_week (department, photo_url, updated_by)
                     VALUES ($1, $2, $3) RETURNING *`,
                    [department, newUrl, req.user.id]
                );
            } else {
                result = await pool.query(
                    `UPDATE person_of_week SET photo_url = $1, updated_by = $2 WHERE department = $3 RETURNING *`,
                    [newUrl, req.user.id, department]
                );
            }

            if (oldUrl) {
                await deletePhoto(oldUrl).catch((e) => console.warn('Old photo cleanup warning:', e.message));
            }

            return res.json({ success: true, data: result.rows[0] });
        } catch (err) {
            console.error('Upload photo error:', err.message);
            return res.status(500).json({ success: false, message: 'Photo upload failed.' });
        }
    }
);

// DELETE /api/admin/:department/person-of-week/photo
router.delete('/:department/person-of-week/photo', requireAuth, (req, res, next) => {
    requireDepartmentAdmin(req.params.department)(req, res, next);
}, async (req, res) => {
    try {
        const { department } = req.params;
        const existing = await pool.query('SELECT photo_url FROM person_of_week WHERE department = $1', [department]);
        const oldUrl = existing.rows[0]?.photo_url;

        await pool.query(
            `UPDATE person_of_week SET photo_url = NULL, updated_by = $1 WHERE department = $2`,
            [req.user.id, department]
        );

        if (oldUrl) {
            await deletePhoto(oldUrl).catch((e) => console.warn('Photo delete warning:', e.message));
        }

        return res.json({ success: true, message: 'Photo removed.' });
    } catch (err) {
        console.error('Delete photo error:', err.message);
        return res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
});

// DELETE /api/admin/:department/person-of-week  (clears the whole entry)
router.delete('/:department/person-of-week', requireAuth, (req, res, next) => {
    requireDepartmentAdmin(req.params.department)(req, res, next);
}, async (req, res) => {
    try {
        const { department } = req.params;
        const existing = await pool.query('SELECT photo_url FROM person_of_week WHERE department = $1', [department]);
        const oldUrl = existing.rows[0]?.photo_url;

        await pool.query('DELETE FROM person_of_week WHERE department = $1', [department]);

        if (oldUrl) {
            await deletePhoto(oldUrl).catch((e) => console.warn('Photo delete warning:', e.message));
        }

        return res.json({ success: true, message: 'Person of the Week entry cleared.' });
    } catch (err) {
        console.error('Delete person-of-week error:', err.message);
        return res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
});

// ---------------------------------------------------------------
// Quote of the Week
// ---------------------------------------------------------------

// PUT /api/admin/:department/quote-of-week   { quoteText, quoteAuthor }
router.put('/:department/quote-of-week', requireAuth, (req, res, next) => {
    requireDepartmentAdmin(req.params.department)(req, res, next);
}, async (req, res) => {
    try {
        const { department } = req.params;
        const { quoteText, quoteAuthor } = req.body || {};

        if (quoteText !== undefined && typeof quoteText !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid quote text.' });
        }
        if (quoteText && quoteText.trim().length > 1000) {
            return res.status(400).json({ success: false, message: 'Quote is too long (max 1000 characters).' });
        }
        if (quoteAuthor && quoteAuthor.trim().length > 150) {
            return res.status(400).json({ success: false, message: 'Author name is too long (max 150 characters).' });
        }

        const existing = await pool.query('SELECT * FROM quote_of_week WHERE department = $1', [department]);

        let result;
        if (existing.rows.length === 0) {
            result = await pool.query(
                `INSERT INTO quote_of_week (department, quote_text, quote_author, updated_by)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [department, quoteText?.trim() ?? null, quoteAuthor?.trim() ?? null, req.user.id]
            );
        } else {
            result = await pool.query(
                `UPDATE quote_of_week
                 SET quote_text = COALESCE($1, quote_text),
                     quote_author = COALESCE($2, quote_author),
                     updated_by = $3
                 WHERE department = $4
                 RETURNING *`,
                [quoteText?.trim() ?? null, quoteAuthor?.trim() ?? null, req.user.id, department]
            );
        }

        return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Update quote-of-week error:', err.message);
        return res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
});

// DELETE /api/admin/:department/quote-of-week
router.delete('/:department/quote-of-week', requireAuth, (req, res, next) => {
    requireDepartmentAdmin(req.params.department)(req, res, next);
}, async (req, res) => {
    try {
        const { department } = req.params;
        await pool.query('DELETE FROM quote_of_week WHERE department = $1', [department]);
        return res.json({ success: true, message: 'Quote of the Week entry cleared.' });
    } catch (err) {
        console.error('Delete quote-of-week error:', err.message);
        return res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
});

module.exports = router;
