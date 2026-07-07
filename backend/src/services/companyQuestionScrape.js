import { CompanyQuestion } from '../models/CompanyQuestion.js';
import { ScrapeState } from '../models/ScrapeState.js';

// Source: github.com/liquidslr/leetcode-company-wise-problems
// We only pull each company's "5. All.csv" — all-time frequency data.
// No license on the repo; we're importing on the user's explicit opt-in.
const SOURCE_KEY = 'leetcode-company-wise-problems';
const GH_REPO = 'liquidslr/leetcode-company-wise-problems';
const GH_API_CONTENTS = `https://api.github.com/repos/${GH_REPO}/contents`;
const GH_API_COMMIT = `https://api.github.com/repos/${GH_REPO}/commits/main`;
const GH_RAW_BASE = `https://raw.githubusercontent.com/${GH_REPO}/main`;
const ALL_CSV_NAME = '5. All.csv';
const CONCURRENCY = 6;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily

// Parse one CSV row respecting quoted fields (the Topics column has commas
// inside quotes). Simple hand-rolled parser; no npm dep.
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      // "" inside a quoted field = literal quote
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text) {
  const rows = [];
  // Normalize line endings and split.
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.length < 2) return rows;
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = {
    difficulty: header.indexOf('difficulty'),
    title: header.indexOf('title'),
    frequency: header.indexOf('frequency'),
    acceptance: header.indexOf('acceptance rate'),
    link: header.indexOf('link'),
    topics: header.indexOf('topics'),
  };
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    if (fields.length < 2) continue;
    const link = idx.link >= 0 ? fields[idx.link] : '';
    const slug = slugFromLink(link) || slugFromTitle(fields[idx.title] || '');
    if (!slug) continue;

    rows.push({
      difficulty: normalizeDifficulty(fields[idx.difficulty]),
      title: fields[idx.title],
      frequency: parseNumber(fields[idx.frequency]),
      acceptanceRate: parseNumber(fields[idx.acceptance]),
      link,
      topics: fields[idx.topics]
        ? fields[idx.topics].split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      slug,
    });
  }
  return rows;
}

function normalizeDifficulty(s) {
  const u = String(s || '').toUpperCase().trim();
  if (u === 'EASY' || u === 'MEDIUM' || u === 'HARD') return u;
  return 'MEDIUM';
}

function parseNumber(s) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function slugFromLink(link) {
  const m = String(link || '').match(/leetcode\.com\/problems\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : '';
}

function slugFromTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'careercopilot-dev',
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'careercopilot-dev' } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

async function listCompanies() {
  const rootListing = await fetchJson(GH_API_CONTENTS);
  if (!Array.isArray(rootListing)) {
    throw new Error('unexpected GitHub root listing shape');
  }
  return rootListing
    .filter((entry) => entry.type === 'dir' && /^[A-Za-z0-9][\w .&-]*$/.test(entry.name))
    .map((entry) => entry.name);
}

/**
 * Pulls the "5. All.csv" for each company and upserts into Mongo. Run with
 * bounded concurrency so we don't blast GitHub's raw content CDN. Safe to
 * call repeatedly — upsert by (company, slug) keeps rows unique.
 */
async function scrapeAll({ onProgress } = {}) {
  const companies = await listCompanies();
  let processed = 0;
  let insertedOrUpdated = 0;
  let skipped = 0;
  const errors = [];

  async function processCompany(company) {
    const url = `${GH_RAW_BASE}/${encodeURIComponent(company)}/${encodeURIComponent(ALL_CSV_NAME)}`;
    try {
      const text = await fetchText(url);
      const rows = parseCsv(text);
      if (rows.length === 0) {
        skipped++;
        return;
      }
      const ops = rows.map((r) => ({
        updateOne: {
          filter: { company, slug: r.slug },
          update: {
            $set: {
              company,
              title: r.title,
              difficulty: r.difficulty,
              frequency: r.frequency,
              acceptanceRate: r.acceptanceRate,
              link: r.link,
              topics: r.topics,
              slug: r.slug,
            },
          },
          upsert: true,
        },
      }));
      await CompanyQuestion.bulkWrite(ops, { ordered: false });
      insertedOrUpdated += rows.length;
    } catch (err) {
      errors.push({ company, error: String(err.message || err).slice(0, 200) });
    } finally {
      processed++;
      if (onProgress) onProgress({ processed, total: companies.length, company });
    }
  }

  // Simple concurrency pool.
  const queue = companies.slice();
  async function worker() {
    while (queue.length > 0) {
      const next = queue.shift();
      await processCompany(next);
    }
  }
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  return {
    companies: companies.length,
    processed,
    rowsUpserted: insertedOrUpdated,
    skipped,
    errors,
  };
}

export async function scrapeCompanyQuestions(opts) {
  return scrapeAll(opts);
}

async function fetchLatestCommitSha() {
  try {
    const data = await fetchJson(GH_API_COMMIT);
    return data?.sha || '';
  } catch (err) {
    console.warn('[company-scrape] could not fetch latest commit sha:', err.message);
    return '';
  }
}

async function runAndPersist(reason) {
  const started = Date.now();
  console.log(`[company-scrape] ${reason} — starting…`);
  const result = await scrapeAll({
    onProgress: ({ processed, total, company }) => {
      if (processed % 20 === 0 || processed === total) {
        console.log(`[company-scrape] ${processed}/${total} (latest: ${company})`);
      }
    },
  });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `[company-scrape] done in ${secs}s — ${result.rowsUpserted} rows across ${result.processed} companies, ${result.errors.length} errors`
  );
  if (result.errors.length) {
    for (const e of result.errors.slice(0, 3)) {
      console.warn(`[company-scrape]   ! ${e.company}: ${e.error}`);
    }
  }
  return result;
}

/**
 * Checks GitHub for a newer commit on main and re-scrapes if one exists.
 * Cheap — one API call when the repo hasn't moved. If GitHub is unreachable,
 * silently no-ops (we don't block boot on upstream availability).
 */
export async function syncIfChanged({ force = false } = {}) {
  const state = await ScrapeState.findOne({ source: SOURCE_KEY });
  const rowsExist = (await CompanyQuestion.estimatedDocumentCount()) > 0;
  const latestSha = await fetchLatestCommitSha();
  const lastChecked = new Date();

  const needsScrape =
    force || !rowsExist || !state?.lastCommitSha || (latestSha && state.lastCommitSha !== latestSha);

  if (!needsScrape) {
    await ScrapeState.updateOne(
      { source: SOURCE_KEY },
      { $set: { lastCheckedAt: lastChecked } },
      { upsert: true }
    );
    console.log(`[company-scrape] up to date (sha ${latestSha.slice(0, 7)})`);
    return { scraped: false, sha: latestSha };
  }

  const reason = force
    ? 'force re-scrape'
    : !rowsExist
    ? 'empty collection'
    : `upstream sha changed (${(state?.lastCommitSha || 'none').slice(0, 7)} → ${latestSha.slice(0, 7)})`;

  const result = await runAndPersist(reason);

  // Update stats cache for the /status endpoint.
  const stats = await CompanyQuestion.aggregate([
    { $group: { _id: '$company' } },
    { $count: 'companies' },
  ]);
  const rows = await CompanyQuestion.estimatedDocumentCount();

  await ScrapeState.updateOne(
    { source: SOURCE_KEY },
    {
      $set: {
        source: SOURCE_KEY,
        lastCommitSha: latestSha,
        lastCheckedAt: lastChecked,
        lastSyncedAt: new Date(),
        stats: { companies: stats[0]?.companies || 0, rows },
      },
    },
    { upsert: true }
  );

  return { scraped: true, sha: latestSha, result };
}

/**
 * Returns lightweight sync status for the frontend. No auth required beyond
 * the existing router-level guard.
 */
export async function getScrapeStatus() {
  const state = await ScrapeState.findOne({ source: SOURCE_KEY });
  return {
    source: SOURCE_KEY,
    repo: GH_REPO,
    lastCommitSha: state?.lastCommitSha || '',
    lastCheckedAt: state?.lastCheckedAt || null,
    lastSyncedAt: state?.lastSyncedAt || null,
    companies: state?.stats?.companies || 0,
    rows: state?.stats?.rows || 0,
  };
}

/**
 * Called once at server startup. Does the initial scrape if needed, then
 * schedules a daily check so upstream changes propagate automatically.
 */
export function bootstrapCompanyQuestions() {
  (async () => {
    try {
      await syncIfChanged();
    } catch (err) {
      console.error('[company-scrape] initial sync failed:', err.message);
    }
  })();

  // Daily drift check. Uses unref() so this timer never keeps the process
  // alive during tests/shutdowns.
  const timer = setInterval(() => {
    syncIfChanged().catch((err) =>
      console.error('[company-scrape] scheduled sync failed:', err.message)
    );
  }, CHECK_INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
}
