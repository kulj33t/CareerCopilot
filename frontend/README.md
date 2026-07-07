# CareerCopilot — Frontend

React 18 + Redux Toolkit + Vite.

## Setup

```bash
cd frontend
npm install
npm run dev
```

Opens [http://localhost:5173](http://localhost:5173). The backend must be running on `:4000` — Vite proxies `/api/*` to it (see [`vite.config.js`](vite.config.js)).

## Folder layout

```
src/
├── main.jsx               Provider + Router + app root
├── App.jsx                Routes, RequireAuth wrapper, bootstrap /me
├── index.css              Full design system (one file)
├── api/                   Thin fetch wrappers, one per domain
│   ├── client.js          credentials-include fetch + ApiError
│   ├── auth.js
│   ├── resumes.js
│   ├── jdMatch.js
│   ├── questions.js
│   ├── prepPlan.js
│   ├── interview.js
│   └── dashboard.js
├── store/
│   ├── index.js           configureStore + persistence wiring
│   ├── persistence.js     debounced localStorage for a tiny subset
│   └── slices/
│       ├── authSlice.js
│       ├── userSlice.js   (holds dashboard data)
│       ├── resumeSlice.js
│       ├── jdSlice.js
│       ├── questionsSlice.js
│       ├── prepSlice.js
│       └── interviewSlice.js
├── components/
│   ├── AppLayout.jsx      sidebar + outlet
│   ├── Sidebar.jsx
│   ├── TopBar.jsx
│   ├── UserMenu.jsx       avatar dropdown with logout
│   ├── RequireAuth.jsx    route guard
│   ├── BrandMark.jsx
│   └── SearchIcon.jsx
├── pages/                 One per route
│   ├── Landing.jsx
│   ├── Auth.jsx
│   ├── Dashboard.jsx
│   ├── ResumeUpload.jsx
│   ├── ResumeResults.jsx
│   ├── JDMatch.jsx
│   ├── QuestionBank.jsx
│   ├── PrepPlan.jsx
│   ├── InterviewSetup.jsx
│   ├── InterviewChat.jsx
│   └── Report.jsx
└── data/
    └── mockData.js        The QB_FILTERS list (only thing left from the mock era)
```

## State flow

- **Auth is server-sourced.** On app mount, `bootstrapAuth()` calls `GET /api/auth/me` to rehydrate the user from the cookie. We don't persist auth state to localStorage.
- **Almost everything else is also server-sourced.** Each slice fetches via a thunk on the page that needs it.
- **LocalStorage only persists the JD draft text.** Everything else — resume list, questions, prep plan, interview session, dashboard — is authoritative on the server.
- **Protected routes** use `<RequireAuth />` which waits for `bootstrapped === true` then either renders or redirects to `/auth`.

## Scripts

```bash
npm run dev      # Vite dev server with HMR
npm run build    # Production build to dist/
npm run preview  # Local preview of the prod build
```

## Proxy config

`vite.config.js` proxies `/api/*` to `http://localhost:4000`. In production you'd put both services behind the same origin (or configure CORS properly) so auth cookies flow.
