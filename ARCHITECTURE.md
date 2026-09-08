# AKUM Class Portal — Architecture Notes

## How this is organized

This is a multi-department student portal system for AKUM. The root `/`
is a plain landing page that links to independent department portals.

```
/
├── index.html              ← department selector (landing page)
│
├── hir/                     ← History & International Relations (production)
│   ├── index.html
│   ├── login.html
│   ├── style.css
│   ├── script.js
│   ├── auth.js
│   └── images/
│
├── social-studies/          ← Social Studies
│   ├── index.html
│   ├── login.html
│   ├── style.css
│   ├── script.js
│   ├── auth.js
│   └── images/
│
└── (future) department-3/ ... department-6/
```

## Design principle: independence over abstraction

Each department folder is a **complete, self-contained copy** of the portal
template. There is no shared CSS/JS framework, no build step, no bundler,
and no cross-department imports. This is intentional:

- A bug or change in one department's files **cannot** break another
  department's portal.
- Any department can be opened and understood on its own — you never have
  to trace logic into a shared folder to know what a page does.
- Nothing here requires Node, npm, or any tooling. It's plain files served
  directly by GitHub Pages.

This does mean some duplication (each department has its own copy of
`script.js`, the nav markup, etc.). That trade-off is deliberate: duplication
is cheap and safe; a shared abstraction that goes wrong is expensive and can
take down every department at once. **Stability > reusability > abstraction.**

## Why department portals don't share `localStorage` keys

All departments are served from the same domain (`akuhir.github.io`), and
`localStorage` is scoped per-domain, not per-folder. Without namespacing,
logging into one department's portal would make you appear "logged in" on
another department's portal too.

To prevent this, each department (other than H.I.R, which keeps its
original keys for backward compatibility) uses a suffixed key set:

| Department | Keys used |
|---|---|
| H.I.R | `currentUser`, `currentUserName`, `loginExpiry` |
| Social Studies | `currentUser_ss`, `currentUserName_ss`, `loginExpiry_ss` |
| Department 3 | `currentUser_dept3`, etc. |
| Department 4 | `currentUser_dept4`, etc. |

The `theme` (dark/light mode) key is intentionally **shared** across all
departments — it's harmless and arguably a nice touch for a student who
navigates between portals.

## How to add a new department (e.g. Department 3)

1. **Copy the template.** Duplicate `/social-studies/` (not `/hir/` — it's
   the cleaner placeholder template) into a new folder, e.g. `/department-3/`.

2. **Set the department name.** Find/replace "Social Studies" with the real
   department name in `index.html`, `login.html` (page titles, nav title,
   headings, welcome text).

3. **Set the department colour.** In `style.css`, update the `:root` and
   `body.dark-mode` blocks — just the `--primary`, `--primary-dark`,
   `--secondary`, `--secondary-dark`, and `--accent-light` values. Everything
   else in the CSS reads from these variables automatically.

4. **Namespace the auth keys.** In `auth.js` and `script.js`, replace every
   `_ss` suffix with a new unique suffix (e.g. `_dept3`).

5. **Add real content when available.** Replace the "Coming Soon" /
   "Placeholder — awaiting department information" text with real
   announcements, assignments, lecture notes, class roster, admin contact,
   and Google Drive/Form links once the department provides them.

6. **Connect it to the landing page.** In the root `/index.html`, copy one
   of the existing `.dept-card` blocks, update its name, description,
   `--dept-color`, icon, and route (`./department-3/login.html`).

No existing department's files need to change to do this — each addition
is purely additive.

## What could be safely shared later (not done yet, on purpose)

If duplication becomes painful once there are 5–6 departments, these are
the *safest* candidates to extract into a `/shared/` folder later, roughly
in order of how low-risk the extraction would be:

1. **Lucide icon initialization snippet** (`window.lucide.createIcons()`
   boilerplate) — trivial, no logic, easy to centralize.
2. **Theme toggle logic** — identical in every department already; a shared
   `theme.js` could be dropped in without touching page-specific state.
2. **Nav open/close + section-switching logic** in `script.js` — currently
   copy-pasted per department; could become one shared `portal-core.js` that
   each `index.html` loads.
3. **Base CSS layout** (navbar, side-nav, card patterns) — the color
   *values* differ per department, but the *rules* are identical. Could
   become a shared `base.css` that each department's `style.css` imports
   and then overrides with its own color variables.

**Not recommended to share:** authentication/roster logic, department
content, images. These are inherently department-specific and mixing them
into shared files is how one department's bug becomes six departments'
outage.

This extraction is optional and should only happen if/when it's clearly
worth the risk — not as a scheduled task.
