import mongoose from 'mongoose';

const dimensionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    value: { type: Number, required: true, min: 0, max: 100 },
    level: { type: String, enum: ['good', 'warn', 'poor'], required: true },
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    severity: { type: String, enum: ['high', 'med', 'low'], required: true },
    category: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    suggestion: { type: String, default: '' },
  },
  { _id: true }
);

const atsCheckSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    pass: { type: Boolean, required: true },
  },
  { _id: false }
);

const resumeAnalysisSchema = new mongoose.Schema(
  {
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
      // One analysis per resume (idempotent). Regeneration overwrites.
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    summary: { type: String, required: true },
    dimensions: { type: [dimensionSchema], required: true },
    feedback: { type: [feedbackSchema], required: true },
    atsChecks: { type: [atsCheckSchema], required: true },

    // Observability — knowing which model produced a cached result matters
    // when we later tune prompts or swap providers.
    llmModel: { type: String, default: '' },
    extractedChars: { type: Number, default: 0 },
  },
  { timestamps: true }
);

resumeAnalysisSchema.methods.toPublic = function toPublic() {
  return {
    resumeId: this.resumeId.toString(),
    overallScore: this.overallScore,
    summary: this.summary,
    dimensions: this.dimensions.map((d) => ({ label: d.label, value: d.value, level: d.level })),
    feedback: this.feedback.map((f) => ({
      id: f._id.toString(),
      severity: f.severity,
      category: f.category,
      title: f.title,
      body: f.body,
      suggestion: f.suggestion || '',
    })),
    atsChecks: this.atsChecks.map((c) => ({ label: c.label, pass: c.pass })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const ResumeAnalysis = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);
