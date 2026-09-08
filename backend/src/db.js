const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is not set.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Render's managed Postgres requires SSL; local dev usually doesn't.
    ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
});

module.exports = pool;
