import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

// Thin storage adapter. All of the app's file ops go through this module so
// we can swap Cloudinary for S3/local without touching routes.

const RESUME_FOLDER = 'careercopilot/resumes';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

function assertConfigured() {
  if (!isCloudinaryConfigured()) {
    const err = new Error(
      'File storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env.'
    );
    err.status = 503;
    throw err;
  }
}

/**
 * Uploads a resume file to Cloudinary as a private "raw" asset.
 * Returns the asset identifier + size we need to persist in Mongo.
 */
export function uploadResume({ buffer, userId, originalName }) {
  assertConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: `${RESUME_FOLDER}/${userId}`,
        // Private: URLs must be signed to fetch. Random publicId on top.
        type: 'authenticated',
        // Keep the original name in the filename component so downloads feel right.
        use_filename: true,
        unique_filename: true,
        filename_override: originalName,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format, // often "pdf"/"docx"
          bytes: result.bytes,
        });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Produces a short-lived signed URL that owners can use to download their file.
 * Anyone without the signature can't access the asset.
 */
export function getSignedResumeUrl({ publicId, format }) {
  assertConfigured();
  const expiresAt = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
  return cloudinary.utils.private_download_url(publicId, format || '', {
    resource_type: 'raw',
    type: 'authenticated',
    expires_at: expiresAt,
  });
}

/**
 * Permanently deletes the asset. Safe to call before removing the Mongo doc —
 * if Cloudinary is already gone we still want the DB record cleaned up.
 */
export async function deleteResumeAsset({ publicId }) {
  assertConfigured();
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
      type: 'authenticated',
      invalidate: true,
    });
  } catch (err) {
    // Log and swallow — a dangling Cloudinary asset is recoverable; blocking
    // the user from deleting their DB record is not.
    console.warn('[storage] failed to delete Cloudinary asset:', publicId, err.message);
  }
}
