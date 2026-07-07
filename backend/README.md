# CareerCopilot — Backend

Express + MongoDB API for CareerCopilot.

## Setup

```bash
cd backend
npm install
cp .env.example .env
# fill in MONGODB_URI, CLOUDINARY_*, GEMINI_API_KEY, JWT_SECRET, COOKIE_SECRET
npm run dev
```

Runs on `http://localhost:4000`. First start seeds 36 interview questions automatically (only if the collection is empty).

## Environment

| Var | Required | Notes |
|---|---|---|
| `PORT` | no (default 4000) | |
| `NODE_ENV` | no (default development) | Switches error-handler verbosity and cookie `secure` flag |
| `CORS_ORIGIN` | no (default http://localhost:5173) | |
| `MONGODB_URI` | **yes** | Atlas SRV string; include a database name (`/careercopilot`) |
| `JWT_SECRET` | **yes** | ≥ 16 chars random |
| `COOKIE_SECRET` | **yes** | ≥ 16 chars random |
| `GEMINI_API_KEY` | **yes** | From [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `CLOUDINARY_CLOUD_NAME` | **yes** | |
| `CLOUDINARY_API_KEY` | **yes** | |
| `CLOUDINARY_API_SECRET` | **yes** | |

Generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Health check

```bash
curl http://localhost:4000/api/health
```
Returns `{ ok, db, ai, storage, uptime, timestamp }`. 503 only if Mongo is unreachable.

## Folder layout

```
src/
├── server.js              entry — starts listener
├── app.js                 Express app factory (helmet, cors, rate-limit, routes)
├── config/
│   ├── env.js             zod-validated env vars
│   ├── db.js              Mongoose connection + status
│   └── cloudinary.js      SDK init + configured check
├── middleware/
│   ├── error.js           404 + global error handler
│   ├── requireAuth.js     JWT cookie verification
│   ├── requestId.js       X-Request-Id on every request
│   ├── rateLimit.js       general + auth + llm limiters
│   └── uploadResume.js    Multer with PDF/DOCX filter + 2 MB cap
├── models/                Mongoose schemas
│   ├── User.js
│   ├── Resume.js
│   ├── ResumeAnalysis.js
│   ├── Question.js
│   ├── QuestionBookmark.js
│   ├── PrepPlan.js
│   └── InterviewSession.js
├── validators/            zod schemas per route group
├── services/
│   ├── auth.js            bcrypt + JWT helpers
│   ├── storage.js         Cloudinary adapter (upload/signed-url/delete)
│   ├── textExtract.js     PDF + DOCX → text
│   ├── llm.js             Gemini adapter (structured output + retries)
│   ├── resumeAnalysis.js
│   ├── jdMatch.js
│   ├── prepPlan.js
│   ├── interview.js
│   ├── questionSeed.js
│   └── dashboard.js
└── routes/                Express routers
    ├── index.js           mounts all sub-routers under /api
    ├── health.js
    ├── auth.js
    ├── resumes.js
    ├── jdMatch.js
    ├── questions.js
    ├── prepPlan.js
    ├── interview.js
    └── dashboard.js
```

## API surface

| Method | Path | Auth | AI | Notes |
|---|---|---|---|---|
| GET | `/api/health` | — | — | Status of db/ai/storage |
| POST | `/api/auth/signup` | — | — | Rate limited 15/min |
| POST | `/api/auth/login` | — | — | Rate limited 15/min |
| POST | `/api/auth/logout` | ✓ | — | |
| GET | `/api/auth/me` | ✓ | — | |
| GET | `/api/resumes` | ✓ | — | List user's resumes |
| POST | `/api/resumes` | ✓ | — | Multipart upload (field: `resume`) |
| GET | `/api/resumes/:id` | ✓ | — | |
| GET | `/api/resumes/:id/file` | ✓ | — | 302 → signed Cloudinary URL |
| DELETE | `/api/resumes/:id` | ✓ | — | Also removes Cloudinary asset |
| GET | `/api/resumes/:id/analysis` | ✓ | — | Cached only, 404 if never analyzed |
| POST | `/api/resumes/:id/analysis` | ✓ | ✓ | Idempotent (`?force=true` to regen) |
| POST | `/api/jd-match` | ✓ | ✓ | Body: `{ resumeId, jdText }` |
| GET | `/api/questions` | ✓ | — | Filters + search + pagination |
| POST | `/api/questions/:id/bookmark` | ✓ | — | Idempotent |
| DELETE | `/api/questions/:id/bookmark` | ✓ | — | Idempotent |
| GET | `/api/prep-plan` | ✓ | ✓ | Auto-generates on first visit |
| POST | `/api/prep-plan/regenerate` | ✓ | ✓ | |
| POST | `/api/prep-plan/tasks/:id/toggle` | ✓ | — | |
| POST | `/api/interview/sessions` | ✓ | ✓ | Reuses active session if one exists |
| GET | `/api/interview/sessions/active` | ✓ | — | |
| GET | `/api/interview/sessions/:id` | ✓ | — | |
| POST | `/api/interview/sessions/:id/messages` | ✓ | ✓ | Synchronous turn |
| POST | `/api/interview/sessions/:id/end` | ✓ | ✓ | Generates report |
| GET | `/api/dashboard` | ✓ | — | Aggregates everything |

## Rate limits

- **General:** 200/min per IP (catch-all)
- **Auth** (signup/login): 15/min per IP — guards credential stuffing
- **AI** (anything that hits Gemini): 30/hr per authenticated user — guards Gemini quota
