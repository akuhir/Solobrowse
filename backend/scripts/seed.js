// Seeds:
//   1. The single H.I.R administrator account (from the spec).
//   2. Initial person_of_week / quote_of_week rows for "hir", using the
//      exact values already hardcoded in the existing H.I.R frontend
//      (index.html) as of this integration — no invented data.
//
// Safe to re-run: uses ON CONFLICT to avoid duplicate/overwritten rows.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/db');

const ADMIN_NAME = 'Muhammad Nurudeen Abubakar';
const ADMIN_MATRIC = 'AKU24/FE/HIS/1034';
const ADMIN_PASSWORD = 'AKU24/FE/HIS/1034'; // per spec: admin ID and password are the same literal value
const ADMIN_DEPARTMENT = 'hir';

// Existing hardcoded values from /hir/index.html at the time of this integration.
const HIR_PERSON_NAME = 'Precious Boluwatife Badmus';
const HIR_PERSON_DESCRIPTION =
    "To our incredible course rep, thank you for being the heartbeat of this class. From coordinating with lecturers to keeping every one of us informed and on track, you carry this responsibility with such grace, patience, and quiet strength. You're often the first to show up and the last to rest, always ready to listen, and to hold things together when it matters most. Your dedication doesn't go unnoticed, it's the reason our class runs as smoothly as it does. Thank you for leading with your whole heart. We appreciate you more than words can say.";
const HIR_QUOTE_TEXT =
    'You can never cross the ocean unless you are ready to lose sight of the shore.';
const HIR_QUOTE_AUTHOR = 'André Gide';

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

        const userResult = await client.query(
            `INSERT INTO users (name, matric_no, password_hash, department, role)
             VALUES ($1, $2, $3, $4, 'admin')
             ON CONFLICT (matric_no) DO UPDATE
                SET password_hash = EXCLUDED.password_hash,
                    name = EXCLUDED.name,
                    department = EXCLUDED.department,
                    role = 'admin'
             RETURNING id`,
            [ADMIN_NAME, ADMIN_MATRIC, passwordHash, ADMIN_DEPARTMENT]
        );
        const adminId = userResult.rows[0].id;

        await client.query(
            `INSERT INTO person_of_week (department, name, description, photo_url, updated_by)
             VALUES ($1, $2, $3, NULL, $4)
             ON CONFLICT (department) DO NOTHING`,
            [ADMIN_DEPARTMENT, HIR_PERSON_NAME, HIR_PERSON_DESCRIPTION, adminId]
        );

        await client.query(
            `INSERT INTO quote_of_week (department, quote_text, quote_author, updated_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (department) DO NOTHING`,
            [ADMIN_DEPARTMENT, HIR_QUOTE_TEXT, HIR_QUOTE_AUTHOR, adminId]
        );

        await client.query('COMMIT');
        console.log('✔ Seed complete.');
        console.log(`  Admin: ${ADMIN_MATRIC} (id ${adminId})`);
        console.log('  H.I.R person_of_week and quote_of_week seeded (if not already present).');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('✘ Seed failed:', err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
