import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';


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

export function uploadResume({ buffer, userId, originalName }) {
  assertConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: `${RESUME_FOLDER}/${userId}`,
        type: 'authenticated',
        use_filename: true,
        unique_filename: true,
        filename_override: originalName,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );
    stream.end(buffer);
  });
}


export function getSignedResumeUrl({ publicId, format }) {
  assertConfigured();
  const expiresAt = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
  return cloudinary.utils.private_download_url(publicId, format || '', {
    resource_type: 'raw',
    type: 'authenticated',
    expires_at: expiresAt,
  });
}


export async function deleteResumeAsset({ publicId }) {
  assertConfigured();
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
      type: 'authenticated',
      invalidate: true,
    });
  } catch (err) {
    console.warn('[storage] failed to delete Cloudinary asset:', publicId, err.message);
  }
}
