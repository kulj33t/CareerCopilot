import mongoose from 'mongoose';

const prepTaskSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true, min: 0, max: 6 }, // 0 = startDate, 6 = +6 days
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, trim: true, maxlength: 500, default: '' },
    duration: { type: String, default: '' },              // "45 min", "2 hr" etc.
    priority: { type: Boolean, default: false },
    category: {
      type: String,
      enum: ['DSA', 'System Design', 'Behavioral', 'Resume', 'Mock', 'Reading', 'Other'],
      default: 'Other',
    },
    // Optional external reference — public URL only. We don't host or mirror
    // any content; we just link to it. Empty string when the LLM didn't
    // produce one.
    refUrl: { type: String, default: '', maxlength: 500 },
    done: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false }
);

const prepPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // One active plan per user. Regeneration overwrites via upsert.
      unique: true,
      index: true,
    },
    startDate: { type: Date, required: true },

    // Context that produced the plan — useful when the user asks for a regen
    // and we want to preview what changes.
    targetRole: { type: String, default: 'Full-stack / SDE' },
    experience: {
      type: String,
      enum: ['fresher', 'early', 'mid', 'senior'],
      default: 'fresher',
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    interviewDate: { type: Date },
    weakTopicsSnapshot: { type: [String], default: [] },

    tasks: { type: [prepTaskSchema], default: [] },

    // Observability
    llmModel: { type: String, default: '' },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

prepPlanSchema.methods.toPublic = function toPublic() {
  const todayIndex = computeTodayIndex(this.startDate);
  return {
    id: this._id.toString(),
    startDate: this.startDate,
    targetRole: this.targetRole,
    experience: this.experience,
    difficulty: this.difficulty,
    interviewDate: this.interviewDate,
    weakTopicsSnapshot: this.weakTopicsSnapshot,
    tasks: this.tasks.map((t) => ({
      id: t._id.toString(),
      day: t.day,
      title: t.title,
      body: t.body,
      duration: t.duration,
      priority: t.priority,
      category: t.category,
      refUrl: t.refUrl,
      done: t.done,
    })),
    todayIndex,
    generatedAt: this.generatedAt,
  };
};

// Days elapsed since startDate, clamped to [0, 6]. -1 if plan is in the future.
function computeTodayIndex(startDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const startMidnight = new Date(startDate);
  startMidnight.setHours(0, 0, 0, 0);
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((todayMidnight - startMidnight) / msPerDay);
  if (diffDays < 0) return -1;
  if (diffDays > 6) return 6; // plan is past-end — stick to last day
  return diffDays;
}

export const PrepPlan = mongoose.model('PrepPlan', prepPlanSchema);
