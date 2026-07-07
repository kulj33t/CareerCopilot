import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    fileType: { type: String, enum: ['PDF', 'DOCX'], required: true },
    sizeBytes: { type: Number, required: true },

    // Cloudinary identifiers — the publicId is the canonical handle we use to
    // generate signed URLs and to delete the asset on cleanup.
    cloudinaryPublicId: { type: String, required: true },
    cloudinaryFormat: { type: String }, // "pdf" | "docx" | ""
  },
  { timestamps: true }
);

resumeSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    originalName: this.originalName,
    fileType: this.fileType,
    sizeBytes: this.sizeBytes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Resume = mongoose.model('Resume', resumeSchema);
