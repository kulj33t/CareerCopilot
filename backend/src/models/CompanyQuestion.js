import mongoose from 'mongoose';

// Each row is one (company × problem) pair. The repo's "5. All.csv" file
// per company gives us all-time frequency data, which is the most useful.
// If we expand to time-windowed files later, add `timeRange` to the unique
// index and model.
// Embedded cached AI answer. Identical shape to QuestionAnswer so the
// frontend modal can render both without branching.
const answerSchema = new mongoose.Schema(
  {
    tldr: { type: String, default: '' },
    explanation: { type: String, default: '' },
    keyPoints: { type: [String], default: [] },
    codeLanguage: { type: String, default: '' },
    codeSample: { type: String, default: '' },
    followUps: { type: [String], default: [] },
    references: {
      type: [
        new mongoose.Schema(
          {
            title: { type: String, required: true },
            url: { type: String, required: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    generatedAt: { type: Date },
    llmModel: { type: String, default: '' },
  },
  { _id: false }
);

const companyQuestionSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      required: true,
      index: true,
    },
    frequency: { type: Number, default: 0 },          // 0-100, company-specific
    acceptanceRate: { type: Number, default: 0 },     // 0-1 global LC stat
    link: { type: String, default: '' },
    topics: { type: [String], default: [] },

    // Slug is the LeetCode problem slug extracted from the link. Lets us
    // dedupe across companies and bulk-upsert cleanly.
    slug: { type: String, required: true, index: true },

    // Optional — populated on first answer request. Cached across users since
    // the problem content doesn't vary per candidate.
    answer: { type: answerSchema, default: null },
  },
  { timestamps: true }
);

// One doc per (company, slug) pair — repeat imports update frequency etc.
companyQuestionSchema.index({ company: 1, slug: 1 }, { unique: true });
companyQuestionSchema.index({ company: 1, frequency: -1 }); // top-N listing

companyQuestionSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    company: this.company,
    title: this.title,
    difficulty: this.difficulty,
    frequency: this.frequency,
    acceptanceRate: this.acceptanceRate,
    link: this.link,
    topics: this.topics,
    slug: this.slug,
    hasAnswer: Boolean(this.answer && this.answer.tldr),
  };
};

companyQuestionSchema.methods.answerPublic = function answerPublic() {
  if (!this.answer) return null;
  const a = this.answer;
  return {
    tldr: a.tldr || '',
    explanation: a.explanation || '',
    keyPoints: a.keyPoints || [],
    codeLanguage: a.codeLanguage || '',
    codeSample: a.codeSample || '',
    followUps: a.followUps || [],
    references: (a.references || []).map((r) => ({ title: r.title, url: r.url })),
    generatedAt: a.generatedAt,
  };
};

export const CompanyQuestion = mongoose.model('CompanyQuestion', companyQuestionSchema);
