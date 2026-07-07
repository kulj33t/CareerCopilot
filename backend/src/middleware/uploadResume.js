import multer from 'multer';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const ACCEPTED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Some browsers report DOCX as a generic type; fall back to extension check.
  'application/octet-stream',
]);

const ACCEPTED_EXT = new Set(['pdf', 'docx']);

function extOf(filename = '') {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function fileTypeFromUpload(file) {
  const ext = extOf(file.originalname);
  if (ext === 'pdf') return 'PDF';
  if (ext === 'docx') return 'DOCX';
  return null;
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = extOf(file.originalname);
    if (!ACCEPTED_EXT.has(ext)) {
      return cb(Object.assign(new Error('Only PDF and DOCX files are allowed'), { status: 400 }));
    }
    if (!ACCEPTED_MIMES.has(file.mimetype)) {
      // Not fatal — we trust the extension check above — but log for visibility.
      console.warn('[upload] unexpected mime:', file.mimetype, 'for', file.originalname);
    }
    cb(null, true);
  },
});

// Express middleware: expects a single file under the field name "resume".
// Translates Multer errors into the shape our global errorHandler expects.
export function resumeUploader(req, res, next) {
  upload.single('resume')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File is too large — max is 2 MB'
          : err.message;
      return next(Object.assign(new Error(message), { status }));
    }
    next(err);
  });
}
