import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { getSignedResumeUrl } from './storage.js';

const FETCH_TIMEOUT_MS = 15_000;

async function fetchBuffer(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`File fetch failed with ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Downloads the resume file from Cloudinary and returns its plain text.
 * Throws with a user-friendly message if extraction fails.
 */
export async function extractTextFromResume(resume) {
  const url = getSignedResumeUrl({
    publicId: resume.cloudinaryPublicId,
    format: resume.cloudinaryFormat,
  });
  const buffer = await fetchBuffer(url);

  if (resume.fileType === 'PDF') {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const { text } = await parser.getText();
    return normalize(text);
  }
  if (resume.fileType === 'DOCX') {
    const { value } = await mammoth.extractRawText({ buffer });
    return normalize(value);
  }
  const err = new Error(`Unsupported file type: ${resume.fileType}`);
  err.status = 400;
  throw err;
}

function normalize(text) {
  return (text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
