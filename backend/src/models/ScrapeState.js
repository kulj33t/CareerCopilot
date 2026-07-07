import mongoose from 'mongoose';

// Tiny singleton-style collection that remembers what we last synced from
// each external source. Keyed by `source` so we can track multiple data
// sources later (roadmap.sh, more repos, etc.) without schema changes.
const scrapeStateSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, unique: true, index: true },
    lastCommitSha: { type: String, default: '' },
    lastCheckedAt: { type: Date },
    lastSyncedAt: { type: Date },
    // Cached stats so the UI can show "X companies / Y rows · updated 2h ago"
    // without an aggregation query every visit.
    stats: {
      companies: { type: Number, default: 0 },
      rows: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const ScrapeState = mongoose.model('ScrapeState', scrapeStateSchema);
