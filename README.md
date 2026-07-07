# CareerCopilot

AI-powered interview prep platform. Upload a resume, get a line-by-line AI review, match it to any job description, run mock interviews with a live AI interviewer, and track your progress across a rolling 84-day heatmap.

- **Frontend:** React 18 + Redux Toolkit + Vite
- **Backend:** Node 20 + Express
- **Database:** MongoDB Atlas (free tier)
- **File storage:** Cloudinary (private, signed URLs)
- **AI:** Google Gemini 2.5 Flash Lite
- **Auth:** JWT in httpOnly cookie + bcrypt

## Project layout

```
carrercopilot/
├── backend/     Express API
├── frontend/    React + Vite app
└── README.md    ← you are here
```

## Quick start

You'll need:
- Node.js 20+
- A MongoDB Atlas cluster (free tier works — [cloud.mongodb.com](https://cloud.mongodb.com))
- A Cloudinary account (free tier — [cloudinary.com](https://cloudinary.com))
- A Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# fill in MONGODB_URI, CLOUDINARY_*, GEMINI_API_KEY, JWT_SECRET, COOKIE_SECRET
npm run dev
```

The API starts on `http://localhost:4000`. Verify with:
```bash
curl http://localhost:4000/api/health
# → { "ok": true, "db": "connected", "ai": "configured", "storage": "configured", ... }
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api/*` to `:4000` so cookies work without CORS dances.

## Features (all backed by real data)

| Page | What it does | AI? |
|---|---|---|
| **Landing** | Marketing page with live product previews | — |
| **Auth** | Signup/login with validation, JWT cookie | — |
| **Dashboard** | Real stats, 84-day heatmap, weak topics from your session history, activity feed | — |
| **Resume Upload** | PDF/DOCX → Cloudinary (private, signed URLs) | — |
| **Resume Analysis** | 5-dimension score + feedback + 12 ATS checks | Gemini |
| **JD Matcher** | Paste a JD → match %, matching/missing skills, tip | Gemini |
| **Question Bank** | 36 seeded interview questions, filters, search, bookmarks | — |
| **Prep Plan** | 7-day personalized plan with external resource links | Gemini |
| **Mock Interview** | Live chat with an AI interviewer, per-answer feedback | Gemini |
| **Report** | Post-session radar + strengths/growth/next steps | Gemini |

## Security posture

- `.env` files are gitignored; production secrets go in a secrets manager
- Passwords hashed with bcrypt (10 rounds)
- JWT in httpOnly cookie (not accessible to JS — mitigates XSS)
- `helmet` for security headers
- Per-IP rate limit on auth routes (15/min)
- Per-user rate limit on AI routes (30/hr — guards Gemini quota)
- Resume files stored as Cloudinary `type: 'authenticated'` — require signed URL to access
- Every `/api/*` route checks ownership before returning data

## AI policy

- Only talks to Gemini through one adapter ([backend/src/services/llm.js](backend/src/services/llm.js)). Swapping to Grok/OpenAI is a one-file change.
- All structured outputs use Gemini's JSON mode with a `responseSchema`, so parse errors are rare.
- Retry-with-backoff on transient 429/503 (3 attempts).
- External URL allowlist in Prep Plan generator — no hallucinated links.
- No roadmap.sh or other third-party content is scraped or mirrored.

## Scripts

```bash
# backend
npm run dev      # nodemon auto-reload
npm start        # production start

# frontend
npm run dev      # vite dev server
npm run build    # production build to dist/
npm run preview  # preview prod build locally
```

See [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md) for deeper details.

## License

Private — not yet licensed for redistribution.
