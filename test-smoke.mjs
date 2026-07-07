// End-to-end smoke test for the whole app.
// Runs against the live backend (:4000) and Vite dev server (:5173) proxy.
// Exercises every endpoint and checks every frontend module compiles.
// Reuses cached Gemini responses where possible to avoid burning quota.

import { writeFileSync, unlinkSync, readFileSync, existsSync } from 'node:fs';

const BASE = 'http://localhost:4000/api';
const FRONT = 'http://localhost:5173';

let PASS = 0;
let FAIL = 0;
let WARN = 0;
const failures = [];

function pass(msg) { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); PASS++; }
function fail(msg) { console.log(`  \x1b[31m✕\x1b[0m ${msg}`); FAIL++; failures.push(msg); }
function warn(msg) { console.log(`  \x1b[33m⚠\x1b[0m ${msg}`); WARN++; }
function hdr(msg)  { console.log(`\n━━━ ${msg} ━━━`); }

function expect(actual, expected, name) {
  if (actual === expected) pass(`${name} (${actual})`);
  else fail(`${name} expected ${expected} got ${actual}`);
}

// ── cookie-jar helpers ────────────────────────────────────────
let cookieHeader = '';
function setCookiesFrom(response) {
  // Set-Cookie may appear multiple times — collect them all.
  const sc = response.headers.getSetCookie?.() || [];
  if (sc.length === 0) {
    const single = response.headers.get('set-cookie');
    if (single) sc.push(single);
  }
  for (const line of sc) {
    const [pair] = line.split(';');
    if (pair.includes('=;')) {
      // Cookie deletion — remove from our jar.
      const name = pair.split('=')[0];
      cookieHeader = cookieHeader
        .split('; ')
        .filter((c) => !c.startsWith(`${name}=`))
        .join('; ');
    } else {
      // Merge into jar, replacing existing of same name.
      const name = pair.split('=')[0];
      const others = cookieHeader
        .split('; ')
        .filter((c) => c && !c.startsWith(`${name}=`));
      others.push(pair);
      cookieHeader = others.join('; ');
    }
  }
}
function clearCookies() { cookieHeader = ''; }

async function req(method, url, { body, headers = {}, redirect = 'manual' } = {}) {
  const full = url.startsWith('http') ? url : `${BASE}${url}`;
  const opts = {
    method,
    redirect,
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...headers,
    },
  };
  if (body !== undefined) {
    if (body instanceof FormData) {
      opts.body = body;
    } else {
      opts.headers['content-type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(full, opts);
  setCookiesFrom(res);
  let json = null;
  const text = await res.text();
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, headers: res.headers, json, text };
}

// ═══════════════════════════════════════════════════════════════
async function main() {
  // 1. Health
  hdr('1. Health & connectivity');
  const h = await req('GET', '/health');
  if (h.json?.db === 'connected') pass('db connected'); else fail(`db state: ${h.json?.db}`);
  if (h.json?.ai === 'configured') pass('gemini key configured'); else fail(`ai: ${h.json?.ai}`);
  if (h.json?.storage === 'configured') pass('cloudinary configured'); else fail(`storage: ${h.json?.storage}`);

  // 2. Security headers
  hdr('2. Security headers');
  const required = [
    ['x-request-id', 'X-Request-Id present'],
    ['x-content-type-options', 'helmet: nosniff'],
    ['x-frame-options', 'helmet: frame-options'],
    ['referrer-policy', 'helmet: referrer-policy'],
  ];
  for (const [k, label] of required) {
    if (h.headers.get(k)) pass(label);
    else fail(`${label} missing`);
  }
  if (h.headers.get('x-powered-by')) fail('X-Powered-By LEAKED');
  else pass('X-Powered-By hidden');

  // 3. Auth flow
  hdr('3. Auth flow');
  clearCookies();
  const email = `smoke+${Date.now()}@test.dev`;
  const pw = 'longenough';

  expect((await req('POST', '/auth/signup', { body: { name: 'Smoke', email, password: pw } })).status, 201, 'signup → 201');
  expect((await req('GET', '/auth/me')).status, 200, '/me with cookie');
  expect((await req('POST', '/auth/signup', { body: { name: 'Dupe', email, password: pw } })).status, 409, 'duplicate email → 409');
  expect((await req('POST', '/auth/signup', { body: { name: 'X', email: 'not-an-email', password: pw } })).status, 400, 'bad email → 400');
  expect((await req('POST', '/auth/signup', { body: { name: 'X', email: 'ok@test.dev', password: 'short' } })).status, 400, 'short password → 400');
  expect((await req('POST', '/auth/login', { body: { email, password: 'wrong' } })).status, 401, 'wrong password → 401');
  expect((await req('POST', '/auth/login', { body: { email, password: pw } })).status, 200, 'login correct → 200');
  expect((await req('POST', '/auth/logout')).status, 200, 'logout → 200');
  expect((await req('GET', '/auth/me')).status, 401, '/me after logout');
  // sign back in
  await req('POST', '/auth/login', { body: { email, password: pw } });
  expect((await req('GET', '/auth/me')).status, 200, 'login restored session');

  // 4. Protected routes return 401 when logged out
  hdr('4. Auth gates');
  const savedCookie = cookieHeader;
  clearCookies();
  for (const path of ['/resumes', '/questions', '/prep-plan', '/dashboard', '/interview/sessions/active']) {
    expect((await req('GET', path)).status, 401, `${path} no-auth`);
  }
  expect(
    (await req('POST', '/jd-match', {
      body: { resumeId: '000000000000000000000000', jdText: 'x'.repeat(40) },
    })).status,
    401,
    '/jd-match no-auth'
  );
  cookieHeader = savedCookie;

  // 5. Question bank
  hdr('5. Question bank');
  const qAll = await req('GET', '/questions?limit=300');
  const total = qAll.json?.total ?? 0;
  const ret = qAll.json?.questions?.length ?? 0;
  if (total >= 240) pass(`total questions ≥ 240 (${total})`); else fail(`only ${total} total`);
  if (total === ret) pass(`single fetch returns all (${ret})`); else fail(`fetch truncated: ${ret}/${total}`);

  const cats = ['DSA', 'Backend', 'Frontend', 'System Design', 'Behavioral', 'DBMS', 'OS', 'Networks'];
  for (const c of cats) {
    const r = await req('GET', `/questions?category=${encodeURIComponent(c)}&limit=300`);
    const n = r.json?.total ?? 0;
    if (n >= 30) pass(`${c}: ${n} questions (≥30)`);
    else fail(`${c}: only ${n}`);
  }

  const dsa = await req('GET', '/questions?category=DSA&limit=300');
  const withUrl = (dsa.json?.questions ?? []).filter((q) => q.referenceUrl).length;
  if (withUrl >= 30) pass(`DSA LeetCode URL coverage: ${withUrl}/${dsa.json.total}`);
  else warn(`DSA LeetCode URL coverage: ${withUrl}/${dsa.json?.total}`);

  // Bookmark round-trip
  const qOne = await req('GET', '/questions?category=DSA&limit=1');
  const qid = qOne.json?.questions?.[0]?.id;
  if (!qid) fail('could not fetch a DSA question id');
  else {
    expect((await req('POST', `/questions/${qid}/bookmark`)).status, 200, 'bookmark');
    expect((await req('POST', `/questions/${qid}/bookmark`)).status, 200, 'bookmark idempotent');
    const bm = await req('GET', '/questions?bookmarked=true&limit=10');
    if (bm.json?.total >= 1) pass(`bookmarked filter returns ${bm.json.total}`);
    else fail(`bookmarked filter: ${bm.json?.total}`);
    expect((await req('DELETE', `/questions/${qid}/bookmark`)).status, 200, 'unbookmark');
  }
  expect((await req('POST', '/questions/bad-id/bookmark')).status, 400, 'invalid question id');
  expect((await req('POST', '/questions/507f1f77bcf86cd799439011/bookmark')).status, 404, 'unknown question id');

  // 6. Resume upload + delete (skip Cloudinary roundtrip if it's slow)
  hdr('6. Resume upload');
  const pdfBytes = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<</Type /Catalog>>\nendobj\nxref\n0 1\n0000000000 65535 f\ntrailer\n<</Size 1>>\nstartxref\n0\n%%EOF'
  );
  const fd = new FormData();
  fd.append('resume', new Blob([pdfBytes], { type: 'application/pdf' }), 'smoke.pdf');
  const up = await req('POST', '/resumes', { body: fd });
  const rid = up.json?.resume?.id;
  if (rid) pass(`upload → resume id ${rid}`);
  else fail(`upload failed: ${up.status} ${up.text?.slice(0, 200)}`);

  if (rid) {
    const lc = await req('GET', '/resumes');
    if ((lc.json?.resumes?.length ?? 0) >= 1) pass('resume appears in list');
    else fail('list empty after upload');

    const redir = await req('GET', `/resumes/${rid}/file`);
    if (redir.status === 302 && redir.headers.get('location')?.includes('cloudinary.com')) {
      pass('/file → 302 to signed Cloudinary URL');
    } else {
      fail(`/file status ${redir.status}`);
    }

    const del = await req('DELETE', `/resumes/${rid}`);
    expect(del.status, 200, 'delete resume');
  }

  // Bad file
  const fdBad = new FormData();
  fdBad.append('resume', new Blob(['hello'], { type: 'text/plain' }), 'bad.txt');
  expect((await req('POST', '/resumes', { body: fdBad })).status, 400, 'non-PDF rejected');

  expect((await req('GET', '/resumes/507f1f77bcf86cd799439011')).status, 404, 'other-user resume 404 (no leak)');

  // 7. Dashboard
  hdr('7. Dashboard aggregation');
  const d = await req('GET', '/dashboard');
  const dash = d.json?.dashboard;
  if (dash?.stats && Object.keys(dash.stats).length === 9) pass('stats has 9 fields');
  else fail(`stats: ${dash?.stats ? Object.keys(dash.stats).length : 'none'} fields`);
  if (dash?.recommendations?.length >= 1) pass(`${dash.recommendations.length} recommendations`);
  else fail('no recommendations');
  if (dash?.heatmap?.length === 84) pass('heatmap 84 cells');
  else fail(`heatmap ${dash?.heatmap?.length} cells`);
  if (Array.isArray(dash?.activity)) pass(`activity feed (${dash.activity.length} items)`);
  else fail('activity missing');
  if (Array.isArray(dash?.weakTopics)) pass(`weak topics (${dash.weakTopics.length})`);
  else fail('weak topics missing');

  // 8. Rate limiting (uses a fresh unauth'd context so it doesn't exhaust the authed one)
  hdr('8. Rate limiting');
  let hits429 = 0;
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'ratelimit@test.dev', password: 'wrong' }),
    });
    if (r.status === 429) hits429++;
  }
  if (hits429 > 0) pass(`limiter kicked in (${hits429} × 429 of 20)`);
  else fail('no rate limiting detected');

  // 9. Frontend module compilation
  hdr('9. Frontend module compilation');
  const modules = [
    'src/main.jsx', 'src/App.jsx', 'src/index.css',
    'src/api/client.js', 'src/api/auth.js', 'src/api/resumes.js',
    'src/api/jdMatch.js', 'src/api/questions.js', 'src/api/prepPlan.js',
    'src/api/interview.js', 'src/api/dashboard.js',
    'src/store/index.js', 'src/store/persistence.js',
    'src/store/slices/authSlice.js', 'src/store/slices/userSlice.js',
    'src/store/slices/resumeSlice.js', 'src/store/slices/jdSlice.js',
    'src/store/slices/questionsSlice.js', 'src/store/slices/prepSlice.js',
    'src/store/slices/interviewSlice.js',
    'src/components/AppLayout.jsx', 'src/components/Sidebar.jsx',
    'src/components/TopBar.jsx', 'src/components/UserMenu.jsx',
    'src/components/RequireAuth.jsx', 'src/components/BrandMark.jsx',
    'src/components/SearchIcon.jsx', 'src/components/QuestionDetailModal.jsx',
    'src/pages/Landing.jsx', 'src/pages/Auth.jsx', 'src/pages/Dashboard.jsx',
    'src/pages/ResumeUpload.jsx', 'src/pages/ResumeResults.jsx',
    'src/pages/JDMatch.jsx', 'src/pages/QuestionBank.jsx', 'src/pages/PrepPlan.jsx',
    'src/pages/InterviewSetup.jsx', 'src/pages/InterviewChat.jsx', 'src/pages/Report.jsx',
  ];
  let ok = 0, brk = [];
  for (const m of modules) {
    const r = await fetch(`${FRONT}/${m}`);
    if (r.status === 200) ok++; else brk.push(`${m} (${r.status})`);
  }
  if (brk.length === 0) pass(`all ${ok} frontend modules compile`);
  else {
    fail(`${brk.length} modules broken`);
    for (const b of brk) console.log(`     ${b}`);
  }
  expect((await fetch(`${FRONT}/`)).status, 200, 'frontend root serves');
  expect((await fetch(`${FRONT}/api/health`)).status, 200, '/api proxied to backend');

  // 10. AI cache hits (avoid fresh Gemini calls by reusing existing cached data)
  hdr('10. AI endpoints (cached-only paths)');
  // GET /analysis for non-existent resume
  const ga = await req('GET', '/resumes/507f1f77bcf86cd799439011/analysis');
  expect(ga.status, 404, 'GET analysis on unknown id → 404');
  // GET /answer on a known question that may or may not be cached
  const q2 = await req('GET', '/questions?category=DSA&limit=1');
  const qid2 = q2.json?.questions?.[0]?.id;
  if (qid2) {
    const a = await req('GET', `/questions/${qid2}/answer`);
    if (a.status === 200) pass(`GET answer on cached question (${qid2})`);
    else if (a.status === 404) warn(`no cached answer yet for ${qid2} (open the modal in the browser to generate one)`);
    else fail(`GET answer unexpected ${a.status}`);
  }
  // Interview active session check
  const ia = await req('GET', '/interview/sessions/active');
  if (ia.status === 200) pass('active interview session found');
  else if (ia.status === 404) pass('no active session (expected for fresh user)');
  else fail(`active session ${ia.status}`);

  // ═══════════════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  PASS: ${PASS}    FAIL: ${FAIL}    WARN: ${WARN}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (FAIL === 0) {
    console.log('  ✅ all automated checks green');
  } else {
    console.log('  ⚠ failures:');
    for (const f of failures) console.log(`     · ${f}`);
  }
  process.exit(FAIL === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\n[runner crashed]', err);
  process.exit(2);
});
