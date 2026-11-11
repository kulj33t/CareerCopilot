# CareerCopilot frontend

React 18, Redux Toolkit, and Vite application for CareerCopilot.

## Local development

```bash
cd frontend
npm install
npm run dev
```

The Vite server opens at `http://localhost:5173` and proxies `/api/*` to the backend at `http://localhost:4000` by default.

## API and deployment configuration

- `VITE_API_PROXY_TARGET` changes the backend used by the local Vite dev and preview proxy. Keep this pointed at the local API for local development.
- `VITE_API_BASE_URL` is optional. Leave it blank to use the same-origin `/api` proxy. Direct backend mode is only for deployments that do not use OAuth; the current OAuth callback flow requires the same-origin proxy.
- Vercel's `/api/*` rewrite targets the custom Render domain in [`vercel.json`](vercel.json), followed by an SPA fallback so refreshed app routes continue to load.

## Authentication and routing

- Auth state is restored from the HTTP-only session cookie through `GET /api/auth/me`; it is not stored in local storage.
- A protected API `401` clears private client state, sends the user to login, and preserves the intended return route.
- Vercel serves the SPA for direct links and refreshes; unknown client routes show an in-app 404 with a home link.
- Local storage is used only for the job-description draft.

## Checks

```bash
npm run build
```
