# AKUM Portal Backend

Centralized Node/Express/PostgreSQL backend serving authentication and
admin content management for all AKUM Class Portal departments (starting
with H.I.R).

This has been tested end-to-end against a real local PostgreSQL instance
and a real running frontend (login → admin dashboard → live public content
update), not just written and assumed to work. See "What was tested" below.

## Local development

```bash
npm install
cp .env.example .env
# edit .env — at minimum set DATABASE_URL and JWT_SECRET

npm run migrate   # creates tables
npm run seed      # creates the H.I.R admin account + initial fallback content
npm start         # starts the server on PORT (default 4000)
```

## Deploying to Render

1. **Create a PostgreSQL database** on Render (Render → New → PostgreSQL).
   Copy its "Internal Database URL" — you'll use this as `DATABASE_URL`.

2. **Create a Web Service** on Render, pointed at this `backend/` folder
   (or its own repo — your choice).
   - Build command: `npm install`
   - Start command: `npm start`

3. **Set environment variables** on the Render service (Settings →
   Environment) using `.env.example` as the checklist:
   - `DATABASE_URL` — from step 1
   - `PGSSL` — leave as `true` (Render Postgres requires SSL)
   - `JWT_SECRET` — generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   - `ALLOWED_ORIGINS` — `https://akuhir.github.io` (add more origins,
     comma-separated, if you serve the frontend from elsewhere too)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
     — from a free Cloudinary account (recommended — see "Photo storage" below)
   - `PORT` — Render sets this automatically, you don't need to set it

4. **Run the migration and seed once**, using Render's Shell tab (or a
   one-off job):
   ```bash
   npm run migrate
   npm run seed
   ```

5. **Point the frontend at the deployed backend.** In `/hir/config.js`,
   change:
   ```js
   window.AKUM_API_BASE_URL = 'https://your-service-name.onrender.com';
   ```
   That's the *only* file that needs to change — no other frontend file
   hardcodes the backend URL.

## Photo storage

By default, if Cloudinary env vars are not set, photos are saved to local
disk under `/uploads` and served at `/uploads/<filename>`. This works for
local development, but **Render's filesystem is ephemeral** — it can be
wiped on redeploy or restart, meaning photos could vanish. For real
production use:

1. Create a free account at cloudinary.com.
2. From the dashboard, copy your Cloud Name, API Key, and API Secret.
3. Set those three as environment variables on Render (see step 3 above).
4. No code changes needed — the backend automatically switches to
   Cloudinary once those three variables are present (see
   `src/utils/photoStorage.js`).

## Adding students later

There is intentionally no public "create account" endpoint. Add students
via the CLI script, which hashes the password for you — you never need to
compute a hash by hand:

```bash
node scripts/add-student.js --name "Muhammad Nurudeen Abubakar" \
                             --matric "AKUM/HIR/24/001" \
                             --department hir
```

If you don't pass `--password`, one is derived automatically from the name
(the middle name, e.g. "Muhammad **Nurudeen** Abubakar" → password
"Nurudeen") and printed once so you can share it with the student — it is
never stored anywhere in plaintext. Pass `--password "Custom"` to override
this if you'd rather choose it yourself.

Run this against the same database as your deployed backend — either via
Render's Shell tab (with the environment already configured), or locally
with `DATABASE_URL` pointed at the Render database's *external* connection
string.

## What was tested (against a real local Postgres + real browser)

- ✅ Admin login with correct credentials
- ✅ Login rejected with wrong password / nonexistent matric (generic 401, no detail leak)
- ✅ `GET /api/me` — valid token, missing token (401), garbage token (401)
- ✅ Admin edits Person of the Week name/description → saved to DB → reflected on public endpoint and public H.I.R page
- ✅ Admin edits/deletes Quote of the Week → same live-reflection confirmed
- ✅ Real photo upload (multipart) → stored → publicly fetchable URL → shown on public page
- ✅ Photo delete → file actually removed from storage, public page falls back correctly
- ✅ Non-image file upload rejected (400)
- ✅ Social Studies student attempting to edit H.I.R content → 403
- ✅ Regular H.I.R student (non-admin) attempting to edit H.I.R content → 403
- ✅ Regular student does not see the Admin Dashboard nav link
- ✅ Regular student manually navigating to `admin-dashboard.html` is shown "Access Denied" and redirected — the backend rejects the underlying API calls regardless of what the page shows
- ✅ Page refresh after edits retains the updated values (confirmed via re-fetch, not just in-memory state)

**Not tested** (requires infrastructure I can't provision from here):
Cloudinary upload path specifically (network to cloudinary.com isn't
reachable from the environment this was built in — the code path is
implemented per Cloudinary's documented API, but only the local-disk
fallback path was actually exercised), and the real Render deployment
itself (requires your Render account).
