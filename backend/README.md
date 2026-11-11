# CareerCopilot backend

Express API backed by MongoDB. It provides authentication, resume storage and analysis, role matching, interview practice, prep plans, and question banks.

## Local development

```bash
cd backend
npm install
cp .env.example .env
# Set MONGODB_URI and JWT_SECRET; add provider credentials for features you use.
npm run dev
```

The API listens on `http://localhost:4000` by default. Check readiness at `/api/health`.

## Environment variables

| Variable                                                               | Purpose                                                                                                              |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                                                 | HTTP port. Render provides this automatically.                                                                       |
| `NODE_ENV`                                                             | Set to `production` on Render.                                                                                       |
| `MONGODB_URI`                                                          | MongoDB connection string; required for account and app data.                                                        |
| `JWT_SECRET`                                                           | Random secret of at least 16 characters; required for sessions. Keep it only in backend/Render environment settings. |
| `CORS_ORIGIN`                                                          | Exact browser origins allowed by credentialed CORS. Comma-separated if needed; never use `*` with credentials.       |
| `PUBLIC_APP_URL`                                                       | Frontend origin used for OAuth callbacks.                                                                            |
| `GROQ_API_KEY`                                                         | Enables AI-generated analysis and practice feedback. Optional for degraded/non-AI use.                               |
| `GROQ_MODEL`                                                           | Optional Groq model override; defaults to `openai/gpt-oss-120b`.                                                     |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Resume file storage credentials.                                                                                     |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                             | Optional Google sign-in credentials. Set both or leave both blank.                                                   |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`                         | Optional LinkedIn sign-in credentials. Set both or leave both blank.                                                 |

## API reliability

- `GET /api/health` reports database, auth, AI, and storage readiness without returning configuration values.
- API responses are not cacheable. Errors include a request ID; production server errors do not expose provider or stack details.
- AI generation limits apply after validation and cache checks, so cached results do not consume the generation quota. Provider calls have a timeout and do not retry rate-limit responses.
- Invalid and expired JWT cookies are cleared; logout is safe to call without a valid session.
