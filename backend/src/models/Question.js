import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    // Title may contain *asterisks* that the frontend renders as emphasis.
    title: { type: String, required: true, trim: true, maxlength: 300 },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    category: {
      type: String,
      required: true,
      enum: ['Frontend', 'Backend', 'DSA', 'System Design', 'Behavioral', 'DBMS', 'OS', 'Networks'],
      index: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['Easy', 'Medium', 'Hard'],
      index: true,
    },
    // List of companies known to ask this question. Searched via regex, so
    // storing as an array is cheap and keeps the filter UI simple.
    companies: { type: [String], default: [], index: true },
    timeEstimate: { type: String, default: '15 min' },

    // Optional public URL pointing at a practice page (usually LeetCode for
    // DSA problems). Purely a hyperlink — we don't mirror the content.
    referenceUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

// Text index over title + body for the search filter. Cheap at this scale.
questionSchema.index({ title: 'text', body: 'text' });

questionSchema.methods.toPublic = function toPublic(bookmarked = false) {
  return {
    id: this._id.toString(),
    title: this.title,
    body: this.body,
    category: this.category,
    difficulty: this.difficulty,
    companies: this.companies.join(' · '),
    companyList: this.companies,
    time: this.timeEstimate,
    referenceUrl: this.referenceUrl || '',
    bookmarked,
  };
};

export const Question = mongoose.model('Question', questionSchema);
