// H.I.R Admin Dashboard logic.
// IMPORTANT: hiding/showing UI here is a convenience only. Every write
// operation below hits a backend route that independently re-verifies the
// admin's identity and department via the JWT — a forged localStorage
// value cannot grant real access, it can only mis-render this page.

const API = window.AKUM_API_BASE_URL;
const DEPARTMENT = window.AKUM_DEPARTMENT;

let currentPersonData = { name: '', description: '', photo_url: null };
let currentQuoteData = { quote_text: '', quote_author: '' };

function authHeaders(extra = {}) {
    const token = localStorage.getItem('authToken');
    return { Authorization: `Bearer ${token}`, ...extra };
}

function showStatus(message, isError = false) {
    const el = document.getElementById('statusMessage');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    el.style.color = isError ? 'var(--danger)' : 'var(--success)';
    el.style.borderColor = isError ? 'var(--danger)' : 'var(--success)';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ---------------------------------------------------------------
// Access check — verifies via the real backend, not just localStorage.
// ---------------------------------------------------------------
async function checkAccess() {
    const token = localStorage.getItem('authToken');
    const checkingEl = document.getElementById('accessChecking');
    const deniedEl = document.getElementById('accessDenied');
    const dashboardEl = document.getElementById('adminDashboard');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`${API}/api/me`, { headers: authHeaders() });
        const data = await res.json();

        if (!res.ok || !data.success || data.user.role !== 'admin' || data.user.department !== DEPARTMENT) {
            checkingEl.style.display = 'none';
            deniedEl.style.display = 'block';
            setTimeout(() => { window.location.href = 'index.html'; }, 2500);
            return;
        }

        checkingEl.style.display = 'none';
        dashboardEl.style.display = 'block';
        loadCurrentContent();
    } catch (err) {
        checkingEl.innerHTML = '<h2>Could not reach the server. Please check your connection and try again.</h2>';
    }
}

// ---------------------------------------------------------------
// Load current Person/Quote of the Week into the dashboard
// ---------------------------------------------------------------
async function loadCurrentContent() {
    try {
        const [personRes, quoteRes] = await Promise.all([
            fetch(`${API}/api/${DEPARTMENT}/person-of-week`),
            fetch(`${API}/api/${DEPARTMENT}/quote-of-week`),
        ]);
        const personJson = await personRes.json();
        const quoteJson = await quoteRes.json();

        currentPersonData = personJson.data || { name: '', description: '', photo_url: null };
        currentQuoteData = quoteJson.data || { quote_text: '', quote_author: '' };

        renderPerson();
        renderQuote();
    } catch (err) {
        showStatus('Failed to load current content.', true);
    }
}

function renderPerson() {
    document.getElementById('adminPersonNameDisplay').textContent =
        currentPersonData.name || '(not set — public page shows its coded fallback)';
    document.getElementById('adminPersonNoteDisplay').textContent =
        currentPersonData.description || '(not set — public page shows its coded fallback)';

    const photoImg = document.getElementById('adminPersonPhoto');
    const photoPlaceholder = document.getElementById('adminPersonPhotoPlaceholder');
    if (currentPersonData.photo_url) {
        photoImg.src = currentPersonData.photo_url;
        photoImg.style.display = 'block';
        photoPlaceholder.style.display = 'none';
    } else {
        photoImg.style.display = 'none';
        photoPlaceholder.style.display = 'flex';
    }
}

function renderQuote() {
    document.getElementById('adminQuoteTextDisplay').textContent =
        currentQuoteData.quote_text || '(not set — public page shows its coded fallback)';
    document.getElementById('adminQuoteAuthorDisplay').textContent =
        currentQuoteData.quote_author || '(not set)';
}

// ---------------------------------------------------------------
// Edit / Save / Cancel wiring (generic, works for all 4 text fields)
// ---------------------------------------------------------------
const FIELD_MAP = {
    personName: { display: 'adminPersonNameDisplay', input: 'adminPersonNameInput', getValue: () => currentPersonData.name },
    personNote: { display: 'adminPersonNoteDisplay', input: 'adminPersonNoteInput', getValue: () => currentPersonData.description },
    quoteText: { display: 'adminQuoteTextDisplay', input: 'adminQuoteTextInput', getValue: () => currentQuoteData.quote_text },
    quoteAuthor: { display: 'adminQuoteAuthorDisplay', input: 'adminQuoteAuthorInput', getValue: () => currentQuoteData.quote_author },
};

function setEditMode(target, editing) {
    const map = FIELD_MAP[target];
    document.getElementById(map.display).style.display = editing ? 'none' : 'block';
    document.getElementById(map.input).style.display = editing ? 'block' : 'none';
    document.querySelector(`.admin-edit-btn[data-target="${target}"]`).style.display = editing ? 'none' : 'inline-flex';
    document.querySelector(`.admin-save-btn[data-target="${target}"]`).style.display = editing ? 'inline-flex' : 'none';
    document.querySelector(`.admin-cancel-btn[data-target="${target}"]`).style.display = editing ? 'inline-flex' : 'none';

    if (editing) {
        document.getElementById(map.input).value = map.getValue() || '';
    }
}

async function saveField(target) {
    const map = FIELD_MAP[target];
    const newValue = document.getElementById(map.input).value.trim();

    try {
        if (target === 'personName' || target === 'personNote') {
            const body =
                target === 'personName' ? { name: newValue } : { description: newValue };
            const res = await fetch(`${API}/api/admin/${DEPARTMENT}/person-of-week`, {
                method: 'PUT',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Save failed.');
            currentPersonData = data.data;
            renderPerson();
        } else {
            const body =
                target === 'quoteText' ? { quoteText: newValue } : { quoteAuthor: newValue };
            const res = await fetch(`${API}/api/admin/${DEPARTMENT}/quote-of-week`, {
                method: 'PUT',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Save failed.');
            currentQuoteData = data.data;
            renderQuote();
        }
        setEditMode(target, false);
        showStatus('Saved successfully.');
    } catch (err) {
        showStatus(err.message || 'Something went wrong.', true);
    }
}

document.querySelectorAll('.admin-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => setEditMode(btn.dataset.target, true));
});
document.querySelectorAll('.admin-cancel-btn').forEach((btn) => {
    btn.addEventListener('click', () => setEditMode(btn.dataset.target, false));
});
document.querySelectorAll('.admin-save-btn').forEach((btn) => {
    btn.addEventListener('click', () => saveField(btn.dataset.target));
});

// ---------------------------------------------------------------
// Photo upload / delete
// ---------------------------------------------------------------
document.getElementById('personPhotoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
        const res = await fetch(`${API}/api/admin/${DEPARTMENT}/person-of-week/photo`, {
            method: 'POST',
            headers: authHeaders(), // no Content-Type — browser sets multipart boundary
            body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Upload failed.');
        currentPersonData = data.data;
        renderPerson();
        showStatus('Photo uploaded successfully.');
    } catch (err) {
        showStatus(err.message || 'Photo upload failed.', true);
    } finally {
        e.target.value = '';
    }
});

document.getElementById('deletePersonPhotoBtn').addEventListener('click', async () => {
    if (!confirm('Remove the current Person of the Week photo?')) return;
    try {
        const res = await fetch(`${API}/api/admin/${DEPARTMENT}/person-of-week/photo`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Delete failed.');
        currentPersonData.photo_url = null;
        renderPerson();
        showStatus('Photo removed.');
    } catch (err) {
        showStatus(err.message || 'Something went wrong.', true);
    }
});

document.getElementById('deletePersonEntryBtn').addEventListener('click', async () => {
    if (!confirm('Delete the entire Person of the Week entry? The public page will fall back to its coded default.')) return;
    try {
        const res = await fetch(`${API}/api/admin/${DEPARTMENT}/person-of-week`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Delete failed.');
        currentPersonData = { name: '', description: '', photo_url: null };
        renderPerson();
        showStatus('Person of the Week entry cleared.');
    } catch (err) {
        showStatus(err.message || 'Something went wrong.', true);
    }
});

document.getElementById('deleteQuoteEntryBtn').addEventListener('click', async () => {
    if (!confirm('Delete the entire Quote of the Week entry? The public page will fall back to its coded default.')) return;
    try {
        const res = await fetch(`${API}/api/admin/${DEPARTMENT}/quote-of-week`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Delete failed.');
        currentQuoteData = { quote_text: '', quote_author: '' };
        renderQuote();
        showStatus('Quote of the Week entry cleared.');
    } catch (err) {
        showStatus(err.message || 'Something went wrong.', true);
    }
});

// ---------------------------------------------------------------
// Hamburger + logout (this page doesn't load script.js, so handle it here)
// ---------------------------------------------------------------
document.getElementById('hamburgerMenu').addEventListener('click', () => {
    document.getElementById('sideNavbar').classList.toggle('open');
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
        const token = localStorage.getItem('authToken');
        if (token) {
            fetch(`${API}/api/auth/logout`, { method: 'POST', headers: authHeaders() }).catch(() => {});
        }
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentUserName');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userDepartment');
        window.location.href = 'login.html';
    }
});

// Dark mode: respect the saved preference so the dashboard matches the portal.
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

checkAccess();
