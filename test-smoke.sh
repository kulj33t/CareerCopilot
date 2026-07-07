#!/bin/bash
# End-to-end smoke test. Exercises every backend endpoint + frontend module
# compilation. Gemini-bound tests reuse cached responses where possible so
# we don't burn the per-minute quota.

set +e
PASS=0
FAIL=0
WARN=0

pass()  { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail()  { echo "  ✕ $1"; FAIL=$((FAIL+1)); }
warn()  { echo "  ⚠ $1"; WARN=$((WARN+1)); }
hdr()   { echo ""; echo "━━━ $1 ━━━"; }

check_status() {
  # $1=expected $2=actual $3=name
  if [ "$2" = "$1" ]; then pass "$3 ($2)"; else fail "$3 expected $1 got $2"; fi
}

BASE=http://localhost:4000/api
FRONT=http://localhost:5173
JAR=/tmp/cc-smoke.txt
rm -f "$JAR"

# ═══════════════════════════════════════════════════════════════
hdr "1. Health & connectivity"
HEALTH=$(curl -s --max-time 5 "$BASE/health")
DB=$(echo "$HEALTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).db)}catch(e){console.log('parse-err')}}")
AI=$(echo "$HEALTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).ai)}catch(e){console.log('parse-err')}}")
STO=$(echo "$HEALTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).storage)}catch(e){console.log('parse-err')}}")
[ "$DB" = "connected" ] && pass "db connected" || fail "db state: $DB"
[ "$AI" = "configured" ] && pass "gemini key configured" || fail "gemini: $AI"
[ "$STO" = "configured" ] && pass "cloudinary configured" || fail "cloudinary: $STO"

# Security headers
hdr "2. Security headers"
HEADERS=$(curl -sI "$BASE/health")
echo "$HEADERS" | grep -qi "X-Request-Id" && pass "X-Request-Id present" || fail "X-Request-Id missing"
echo "$HEADERS" | grep -qi "X-Content-Type-Options: nosniff" && pass "helmet: nosniff" || fail "helmet: nosniff missing"
echo "$HEADERS" | grep -qi "X-Frame-Options" && pass "helmet: frame-options" || fail "frame-options missing"
echo "$HEADERS" | grep -qi "Referrer-Policy" && pass "helmet: referrer-policy" || fail "referrer-policy missing"
echo "$HEADERS" | grep -qi "X-Powered-By" && fail "X-Powered-By LEAKED" || pass "X-Powered-By hidden"

# ═══════════════════════════════════════════════════════════════
hdr "3. Auth flow"
EMAIL="smoke+$(date +%s)@test.dev"
SIGNUP=$(curl -s -c "$JAR" -w "%{http_code}" -o /tmp/cc-signup.json -X POST "$BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Smoke User\",\"email\":\"$EMAIL\",\"password\":\"longenough\"}")
check_status "201" "$SIGNUP" "signup → 201"

ME=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" "$BASE/auth/me")
check_status "200" "$ME" "/me with cookie"

DUPE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Dupe\",\"email\":\"$EMAIL\",\"password\":\"longenough\"}")
check_status "409" "$DUPE" "duplicate email → 409"

BADE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"name":"X","email":"not-an-email","password":"longenough"}')
check_status "400" "$BADE" "bad email → 400"

SHORTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"name":"X","email":"short@test.dev","password":"short"}')
check_status "400" "$SHORTP" "short password → 400"

BADL=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"wrong\"}")
check_status "401" "$BADL" "wrong password → 401"

LOGIN=$(curl -s -c "$JAR" -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"longenough\"}")
check_status "200" "$LOGIN" "login correct → 200"

LO=$(curl -s -b "$JAR" -c "$JAR" -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/logout")
check_status "200" "$LO" "logout → 200"

MEOUT=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" "$BASE/auth/me")
check_status "401" "$MEOUT" "/me after logout"

# Sign back in for the rest of the tests
curl -s -c "$JAR" -o /dev/null -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"longenough\"}"

# ═══════════════════════════════════════════════════════════════
hdr "4. Auth-protected routes (all must 401 when logged out)"
rm -f /tmp/cc-noauth.txt
for path in "resumes" "questions" "prep-plan" "dashboard" "interview/sessions/active" "jd-match"; do
  if [ "$path" = "jd-match" ]; then
    METHOD="POST"
    BODY='{"resumeId":"000000000000000000000000","jdText":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}'
    code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/$path" -H "Content-Type: application/json" -d "$BODY")
  else
    code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/$path")
  fi
  check_status "401" "$code" "$path no-auth"
done

# ═══════════════════════════════════════════════════════════════
hdr "5. Question bank"
Q_ALL=$(curl -s -b "$JAR" "$BASE/questions?limit=300" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j.total+':'+j.questions.length)}catch(e){console.log('err:'+e.message)}}")
TOTAL="${Q_ALL%%:*}"; RET="${Q_ALL##*:}"
[ "$TOTAL" -ge "240" ] && pass "total questions >= 240 (got $TOTAL)" || fail "total questions only $TOTAL"
[ "$TOTAL" = "$RET" ] && pass "single-fetch returns all ($RET)" || fail "fetch truncated: $RET of $TOTAL"

for cat in "DSA" "Backend" "Frontend" "System%20Design" "Behavioral" "DBMS" "OS" "Networks"; do
  c=$(curl -s -b "$JAR" "$BASE/questions?category=$cat&limit=300" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).total)}catch(e){console.log(0)}}")
  [ "$c" -ge "30" ] && pass "$(echo $cat | sed 's/%20/ /g'): $c questions (≥30)" || fail "$(echo $cat | sed 's/%20/ /g'): only $c"
done

# DSA LeetCode URL coverage
DSA_WITH_URL=$(curl -s -b "$JAR" "$BASE/questions?category=DSA&limit=300" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d); const withUrl=j.questions.filter(q=>q.referenceUrl).length;
  console.log(withUrl+'/'+j.total);
});
")
echo "  · DSA with LeetCode URL: $DSA_WITH_URL"

# Bookmark round-trip
QID=$(curl -s -b "$JAR" "$BASE/questions?category=DSA&limit=1" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log(JSON.parse(d).questions[0].id)}")
BK1=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X POST "$BASE/questions/$QID/bookmark")
check_status "200" "$BK1" "bookmark question"
BK2=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X POST "$BASE/questions/$QID/bookmark")
check_status "200" "$BK2" "bookmark idempotent"
BMC=$(curl -s -b "$JAR" "$BASE/questions?bookmarked=true" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log(JSON.parse(d).total)}")
[ "$BMC" = "1" ] && pass "bookmarked filter returns 1" || fail "bookmarked=$BMC"
UB=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X DELETE "$BASE/questions/$QID/bookmark")
check_status "200" "$UB" "unbookmark"

# Bad ids
BADID=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X POST "$BASE/questions/bad-id/bookmark")
check_status "400" "$BADID" "invalid question id"
UNKQ=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X POST "$BASE/questions/507f1f77bcf86cd799439011/bookmark")
check_status "404" "$UNKQ" "unknown question id"

# ═══════════════════════════════════════════════════════════════
hdr "6. Resume upload"
printf '%%PDF-1.4\n1 0 obj\n<</Type /Catalog>>\nendobj\nxref\n0 1\n0000000000 65535 f\ntrailer\n<</Size 1>>\nstartxref\n0\n%%%%EOF' > /d/carrercopilot/backend/smoke-test.pdf

UP=$(curl -s -b "$JAR" -X POST "$BASE/resumes" -F "resume=@D:/carrercopilot/backend/smoke-test.pdf;type=application/pdf")
RID=$(echo "$UP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).resume.id)}catch(e){console.log('')}}")
[ -n "$RID" ] && pass "upload → resume id $RID" || fail "upload failed"

LC=$(curl -s -b "$JAR" "$BASE/resumes" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log(JSON.parse(d).resumes.length)}")
[ "$LC" -ge "1" ] && pass "resume appears in list" || fail "list empty after upload"

REDIR=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/resumes/$RID/file")
[ "$REDIR" = "302" ] && pass "/file → 302 signed URL" || fail "/file $REDIR"

FOLLOW=$(curl -sL -b "$JAR" -o /dev/null -w "%{http_code}:%{size_download}" "$BASE/resumes/$RID/file")
BYTES="${FOLLOW##*:}"; HTTP="${FOLLOW%%:*}"
[ "$HTTP" = "200" ] && [ "$BYTES" -gt "0" ] && pass "download follows redirect ($BYTES bytes)" || fail "download $FOLLOW"

# Error paths
echo "hello" > /d/carrercopilot/backend/bad.txt
WRONG=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X POST "$BASE/resumes" -F "resume=@D:/carrercopilot/backend/bad.txt")
check_status "400" "$WRONG" "non-PDF rejected"
rm -f /d/carrercopilot/backend/bad.txt

OTHER=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/resumes/507f1f77bcf86cd799439011")
check_status "404" "$OTHER" "other-user resume 404 (no leak)"

DEL=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X DELETE "$BASE/resumes/$RID")
check_status "200" "$DEL" "delete resume"
rm -f /d/carrercopilot/backend/smoke-test.pdf

# ═══════════════════════════════════════════════════════════════
hdr "7. Dashboard aggregation"
D=$(curl -s -b "$JAR" "$BASE/dashboard" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d); const x=j.dashboard;
  console.log(Object.keys(x.stats).length+':'+x.recommendations.length+':'+x.heatmap.length+':'+x.activity.length);
});
")
KSTAT="${D%%:*}"; REST="${D#*:}"; RECS="${REST%%:*}"; REST="${REST#*:}"; HM="${REST%%:*}"; ACT="${REST##*:}"
[ "$KSTAT" = "9" ] && pass "stats has 9 fields" || fail "stats fields: $KSTAT"
[ "$RECS" -ge "1" ] && pass "recommendations present ($RECS)" || fail "no recommendations"
[ "$HM" = "84" ] && pass "heatmap has 84 cells" || fail "heatmap cells: $HM"

# ═══════════════════════════════════════════════════════════════
hdr "8. Rate limiting"
echo "  making 20 rapid auth attempts (limit is 15/min/IP)…"
STATUSES=""
for i in $(seq 1 20); do
  s=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"ratelimit@test.dev","password":"wrong"}')
  STATUSES="$STATUSES $s"
done
HITS_429=$(echo "$STATUSES" | tr ' ' '\n' | grep -c "^429$")
[ "$HITS_429" -gt "0" ] && pass "rate limiter kicked in ($HITS_429 × 429 out of 20)" || fail "no rate limiting detected"

# ═══════════════════════════════════════════════════════════════
hdr "9. Frontend module compilation"
compile_ok=0
compile_fail=0
for p in \
  "src/main.jsx" "src/App.jsx" "src/index.css" \
  "src/api/client.js" "src/api/auth.js" "src/api/resumes.js" "src/api/jdMatch.js" \
  "src/api/questions.js" "src/api/prepPlan.js" "src/api/interview.js" "src/api/dashboard.js" \
  "src/store/index.js" "src/store/persistence.js" \
  "src/store/slices/authSlice.js" "src/store/slices/userSlice.js" \
  "src/store/slices/resumeSlice.js" "src/store/slices/jdSlice.js" \
  "src/store/slices/questionsSlice.js" "src/store/slices/prepSlice.js" \
  "src/store/slices/interviewSlice.js" \
  "src/components/AppLayout.jsx" "src/components/Sidebar.jsx" \
  "src/components/TopBar.jsx" "src/components/UserMenu.jsx" \
  "src/components/RequireAuth.jsx" "src/components/BrandMark.jsx" \
  "src/components/SearchIcon.jsx" "src/components/QuestionDetailModal.jsx" \
  "src/pages/Landing.jsx" "src/pages/Auth.jsx" "src/pages/Dashboard.jsx" \
  "src/pages/ResumeUpload.jsx" "src/pages/ResumeResults.jsx" \
  "src/pages/JDMatch.jsx" "src/pages/QuestionBank.jsx" "src/pages/PrepPlan.jsx" \
  "src/pages/InterviewSetup.jsx" "src/pages/InterviewChat.jsx" "src/pages/Report.jsx"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$FRONT/$p")
  if [ "$code" = "200" ]; then compile_ok=$((compile_ok+1)); else compile_fail=$((compile_fail+1)); echo "    ✕ $p ($code)"; fi
done
[ "$compile_fail" = "0" ] && pass "all $compile_ok frontend modules compile" || fail "$compile_fail modules broken"

# Root + proxy
ROOT=$(curl -s -o /dev/null -w "%{http_code}" "$FRONT/")
check_status "200" "$ROOT" "frontend root serves"
PROXY=$(curl -s -o /dev/null -w "%{http_code}" "$FRONT/api/health")
check_status "200" "$PROXY" "/api proxied to backend"

# ═══════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PASS: $PASS    FAIL: $FAIL    WARN: $WARN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
[ "$FAIL" = "0" ] && echo "All non-AI checks passed." || echo "⚠ Fix the failures above."
