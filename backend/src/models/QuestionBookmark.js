import mongoose from 'mongoose';

const questionBookmarkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
  },
  { timestamps: true }
);

// One bookmark per (user, question) pair. Attempting to create a duplicate
// surfaces as a Mongo 11000 error which the route translates into a no-op.
questionBookmarkSchema.index({ userId: 1, questionId: 1 }, { unique: true });

export const QuestionBookmark = mongoose.model('QuestionBookmark', questionBookmarkSchema);
