import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

// Configure once at module-load time. If any of the three env vars are missing,
// `isCloudinaryConfigured()` returns false and upload routes should 503 with a
// helpful error instead of silently failing.
export function isCloudinaryConfigured() {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
  );
}

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export { cloudinary };
