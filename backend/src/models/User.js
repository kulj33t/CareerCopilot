import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'invalid email'],
    },
    // Local accounts have a passwordHash; OAuth accounts do not.
    passwordHash: { type: String, select: false },

    // Auth provider used to create the account. Local users sign in with
    // email/password; OAuth users sign in via Google/LinkedIn redirect.
    provider: {
      type: String,
      enum: ['local', 'google', 'linkedin'],
      default: 'local',
      index: true,
    },
    providerId: { type: String, index: true },

    avatarUrl: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    avatarUrl: this.avatarUrl || null,
    provider: this.provider,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
