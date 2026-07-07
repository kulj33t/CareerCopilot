import mongoose from 'mongoose';

const referenceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    url: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const questionAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      unique: true, // one cached answer per question
      index: true,
    },

    // Short headline so the first line of the modal is informative even
    // before the user reads the full explanation.
    tldr: { type: String, required: true, maxlength: 400 },

    // HTML-safe explanation — may contain <code>, <strong>, <ul>/<li>, <p>.
    // Any <script> or `on*` attributes are stripped on write.
    explanation: { type: String, required: true },

    keyPoints: { type: [String], default: [] },

    // Optional code snippet. Empty strings when the question isn't code-based.
    codeLanguage: { type: String, default: '' },
    codeSample: { type: String, default: '' },

    followUps: { type: [String], default: [] },
    references: { type: [referenceSchema], default: [] },

    llmModel: { type: String, default: '' },
  },
  { timestamps: true }
);

questionAnswerSchema.methods.toPublic = function toPublic() {
  return {
    questionId: this.questionId.toString(),
    tldr: this.tldr,
    explanation: this.explanation,
    keyPoints: this.keyPoints || [],
    codeLanguage: this.codeLanguage || '',
    codeSample: this.codeSample || '',
    followUps: this.followUps || [],
    references: (this.references || []).map((r) => ({ title: r.title, url: r.url })),
    updatedAt: this.updatedAt,
  };
};

export const QuestionAnswer = mongoose.model('QuestionAnswer', questionAnswerSchema);
