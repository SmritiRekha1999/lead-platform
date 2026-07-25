# LeadFlow — Lead Management Platform

A small but complete lead-management application a sales team could actually use: a public capture form, an authenticated internal app with two roles and enforced permissions, a full lead lifecycle, a documented JSON API, automated tests, and free-tier deployment.

> **Built for Digital Heroes Training Task** — <https://digitalheroesco.com>
>
> **Live app:** https://lead-platform-theta.vercel.app
> **API base:** https://lead-platform-ok7z.onrender.com

---

## What it does

- **Public capture form** — anyone can submit a lead; no login required.
- **Authenticated internal app** — the sales team logs in to manage leads.
- **Two roles with real enforcement:**
  - **Admin** — sees every lead, assigns leads to members, creates team members.
  - **Member** — sees only leads assigned to them; can add notes and move their leads through the pipeline.
  - Permissions are enforced on **both** the client (hidden UI) **and** the server (the source of truth — a member calling an admin route directly gets `403`).
- **Lead lifecycle** — a status pipeline (`new → contacted → qualified → proposal → won → lost`), assignment to a user, timestamped notes, and an automatic activity trail of every change.
- **JSON API** — pagination, filtering, search, and correct HTTP status codes (documented below).
- **Automated tests** — auth rules plus two core end-to-end flows.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18 (function components, hooks), React Router, Vite |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Auth | JWT (stateless), bcrypt password hashing |
| Tests | Jest + Supertest + mongodb-memory-server |
| Deploy | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

---

## Data model

**User**

| Field | Type | Notes |
| --- | --- | --- |
| name | String | required |
| email | String | required, unique, lowercased |
| passwordHash | String | bcrypt; never returned in API responses |
| role | String | `admin` or `member` |

**Lead**

| Field | Type | Notes |
| --- | --- | --- |
| name, email | String | required |
| phone, company | String | optional |
| source | String | `public_form` or `manual` |
| status | String | one of the pipeline stages |
| assignedTo | ObjectId → User | null until assigned |
| notes | `[{ body, author, createdAt }]` | timestamped, manual |
| activity | `[{ type, message, actor, createdAt }]` | timestamped, automatic |

**Notes vs. activity** — notes are written by people ("called, no answer"); the activity trail is written by the system on every meaningful change (`created`, `assigned`, `status_changed`, `note_added`). Keeping them separate is what makes this a platform rather than a form.

## Roles & permissions

| Action | Admin | Member |
| --- | --- | --- |
| Submit public lead | ✔ (public) | ✔ (public) |
| List leads | all leads | only their own |
| View a single lead | any | only their own (else `403`) |
| Change status / edit | any | only their own |
| Assign a lead | ✔ | ✗ `403` |
| Add a note | any | only their own |
| Create a team member | ✔ | ✗ `403` |

---

## Local setup

Requires Node.js 18+ and a MongoDB connection string (local `mongod` or a free MongoDB Atlas cluster).

### 1. Backend

```bash
cd server
npm install
cp .env.example .env      # then fill in MONGODB_URI and JWT_SECRET
npm run seed              # creates demo accounts + sample leads
npm run dev               # starts the API on http://localhost:5000
```

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:5000 for local dev
npm run dev               # starts the app on http://localhost:5173
```

### Demo credentials (created by `npm run seed`)

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@example.com | Admin@123 |
| Member | member@example.com | Member@123 |

## Running the tests

```bash
cd server
npm test
```

The suite uses an in-memory MongoDB, so no external database is needed. The **first** run downloads a small MongoDB binary (needs internet); later runs are offline. It covers:

- **Auth rules** — `401` for missing/invalid tokens, `403` for wrong-role access, login success/failure, a member being blocked from another member's lead.
- **Core flow 1** — public capture → admin assigns → member notes → member advances status, with the activity trail asserted.
- **Core flow 2** — pagination and status filtering with member scoping, plus rejection of an invalid filter (`400`).

---

## API reference

Base URL: `<API base>/api`. All request and response bodies are JSON. Authenticated routes expect an `Authorization: Bearer <token>` header.

### Status codes used

| Code | Meaning |
| --- | --- |
| 200 | OK |
| 201 | Created |
| 400 | Bad request (validation) |
| 401 | Not authenticated |
| 403 | Authenticated but not permitted |
| 404 | Not found |
| 409 | Conflict (e.g. duplicate email) |
| 500 | Server error |

### Auth

**POST `/api/auth/login`** — public. Body: `{ "email", "password" }`. Returns `{ token, user }`. → `200`, `400`, `401`.

**GET `/api/auth/me`** — auth. Returns the current `{ user }`. → `200`, `401`.

**GET `/api/auth/members`** — admin only. Returns `{ users: [...] }`. → `200`, `401`, `403`.

**POST `/api/auth/members`** — admin only. Body: `{ "name", "email", "password", "role?" }`. Returns `{ user }`. → `201`, `400`, `401`, `403`, `409`.

### Public capture

**POST `/api/public/leads`** — public. Body: `{ "name", "email", "phone?", "company?" }`. Creates a `new` lead. Returns `{ lead }`. → `201`, `400`.

### Leads (all require auth)

**GET `/api/leads`** — list, scoped by role. Query parameters:

| Param | Meaning |
| --- | --- |
| `page` | page number (default 1) |
| `limit` | page size (default 20, max 100) |
| `status` | filter by pipeline stage |
| `assignedTo` | (admin only) filter by assignee id |
| `q` | search across name, email, company |

Returns `{ data: [...], pagination: { page, limit, total, totalPages } }`. → `200`, `400`, `401`.

**GET `/api/leads/:id`** — single lead (members: only their own). Returns `{ lead }` with populated assignee, notes, and activity. → `200`, `400`, `401`, `403`, `404`.

**POST `/api/leads`** — create a lead manually. Body: `{ "name", "email", "phone?", "company?", "assignedTo?" }` (only an admin may set `assignedTo`). → `201`, `400`, `401`.

**PATCH `/api/leads/:id`** — update status and/or fields (members: only their own). Body: any of `{ "status", "name", "email", "phone", "company" }`. A status change appends to the activity trail. → `200`, `400`, `401`, `403`, `404`.

**PATCH `/api/leads/:id/assign`** — admin only. Body: `{ "assignedTo" }`. → `200`, `400`, `401`, `403`, `404`.

**POST `/api/leads/:id/notes`** — add a timestamped note (members: only their own). Body: `{ "body" }`. → `201`, `400`, `401`, `403`, `404`.

---

## Deployment (free tier)

### 1. MongoDB Atlas
Create a free M0 cluster, add a database user, allow network access from anywhere (`0.0.0.0/0`), and copy the connection string.

### 2. Backend on Render
- New → Web Service → connect this repo → set **root directory** to `server`.
- Build command `npm install`, start command `npm start`.
- Environment variables: `MONGODB_URI` (the Atlas string) and `JWT_SECRET` (a long random string).
- After the first deploy, run the seed once (Render Shell): `npm run seed`.
- A `render.yaml` blueprint is included at the repo root.

### 3. Frontend on Vercel
- New Project → import this repo → set **root directory** to `client`.
- Framework preset: Vite. Environment variable: `VITE_API_URL` = your Render API URL.
- `client/vercel.json` already handles single-page-app routing.

---

## Project structure

```
lead-platform/
├── server/
│   ├── src/
│   │   ├── models/         User, Lead
│   │   ├── middleware/     JWT auth + role guard
│   │   ├── controllers/    auth + lead logic
│   │   ├── routes/         auth, public, leads
│   │   ├── config/         db connection
│   │   ├── utils/          seed, asyncHandler
│   │   ├── app.js          express app (exported for tests)
│   │   └── index.js        server entry
│   └── tests/              auth + core-flow tests
├── client/
│   └── src/
│       ├── context/        AuthContext
│       ├── components/     Footer, ProtectedRoute
│       ├── pages/          PublicCapture, Login, Dashboard, LeadDetail
│       ├── api.js          API helper
│       └── App.jsx         routes
├── render.yaml
└── README.md
```
