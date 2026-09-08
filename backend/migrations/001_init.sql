-- AKUM Class Portals — initial schema
-- Designed so additional departments can be added without restructuring auth.

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    matric_no       VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    department      VARCHAR(50) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_matric_no ON users(matric_no);

-- One row per department holds the current live Person of the Week.
CREATE TABLE IF NOT EXISTS person_of_week (
    id              SERIAL PRIMARY KEY,
    department      VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(150),
    description     TEXT,
    photo_url       TEXT,
    updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per department holds the current live Quote of the Week.
CREATE TABLE IF NOT EXISTS quote_of_week (
    id              SERIAL PRIMARY KEY,
    department      VARCHAR(50) NOT NULL UNIQUE,
    quote_text      TEXT,
    quote_author    VARCHAR(150),
    updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep updated_at fresh automatically.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_pow_updated_at ON person_of_week;
CREATE TRIGGER trg_pow_updated_at
    BEFORE UPDATE ON person_of_week
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_qow_updated_at ON quote_of_week;
CREATE TRIGGER trg_qow_updated_at
    BEFORE UPDATE ON quote_of_week
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
