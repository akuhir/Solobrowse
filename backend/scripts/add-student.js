// Safe CLI for adding a single student — no public/unauthenticated HTTP
// endpoint exists for this, by design (see spec section 31).
//
// Usage:
//   node scripts/add-student.js --name "Muhammad Nurudeen Abubakar" \
//                                --matric "AKUM/HIR/24/001" \
//                                --department hir
//
// Optional:
//   --password "SomeCustomPassword"   (overrides the auto-derived password)
//
// PASSWORD CONVENTION (documented assumption — see README):
//   If --password is not supplied, the password is derived from the name:
//     - 3+ words  -> the middle word is used  (e.g. "Muhammad Nurudeen Abubakar" -> "Nurudeen")
//     - 2 words   -> the second word is used  (e.g. "Ada Obi" -> "Obi")
//     - 1 word    -> that single word is used
//   This matches the example given in the spec. The derived password is
//   printed once at creation time so it can be given to the student —
//   it is never stored anywhere in plaintext.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/db');

function parseArgs() {
    const args = process.argv.slice(2);
    const out = {};
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace(/^--/, '');
        out[key] = args[i + 1];
    }
    return out;
}

function derivePassword(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 3) return parts[1];
    if (parts.length === 2) return parts[1];
    return parts[0];
}

async function addStudent() {
    const { name, matric, department, password } = parseArgs();

    if (!name || !matric || !department) {
        console.error(
            'Usage: node scripts/add-student.js --name "Full Name" --matric "MATRIC/NO" --department hir [--password "Custom"]'
        );
        process.exitCode = 1;
        return;
    }

    const finalPassword = password || derivePassword(name);
    const passwordHash = await bcrypt.hash(finalPassword, 12);

    try {
        const result = await pool.query(
            `INSERT INTO users (name, matric_no, password_hash, department, role)
             VALUES ($1, $2, $3, $4, 'student')
             RETURNING id, matric_no`,
            [name.trim(), matric.trim(), passwordHash, department.trim()]
        );
        console.log('✔ Student added:');
        console.log(`  Matric:   ${result.rows[0].matric_no}`);
        console.log(`  Password: ${finalPassword}  (share this with the student — not stored anywhere in plaintext)`);
    } catch (err) {
        if (err.code === '23505') {
            console.error(`✘ A user with matric number "${matric}" already exists.`);
        } else {
            console.error('✘ Failed to add student:', err.message);
        }
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

addStudent();
