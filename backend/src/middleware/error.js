// Catch-all for routes that don't match. Mount after all real routes.
export function notFound(req, res, next) {
  res.status(404).json({
    error: { message: 'The requested API route was not found.' },
    requestId: req.id,
  });
}

// Global error handler. Throws or `next(err)` from any route lands here.
// In dev, include the stack to make debugging fast. In prod, hide it.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const candidateStatus = Number(err.status || err.statusCode);
  const status = Number.isInteger(candidateStatus) && candidateStatus >= 400 && candidateStatus <= 599
    ? candidateStatus
    : 500;
  const isProd = process.env.NODE_ENV === 'production';
  if (status >= 500) console.error('[error]', err);
  const message = status >= 500 && isProd
    ? status === 503
      ? 'The service is temporarily unavailable. Please try again shortly.'
      : 'Something went wrong on our side. Please try again in a moment.'
    : err.message || 'Internal server error';
  if (status === 429 && /^\d{1,6}$/.test(String(err.retryAfter || ''))) {
    res.set('Retry-After', String(err.retryAfter));
  }
  res.status(status).json({
    error: {
      message,
      ...(err.details && !(status >= 500 && isProd) ? { details: err.details } : {}),
      ...(isProd ? {} : { stack: err.stack }),
    },
    requestId: req.id,
  });
}
