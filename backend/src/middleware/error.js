// Catch-all for routes that don't match. Mount after all real routes.
export function notFound(req, res, next) {
  res.status(404).json({
    error: { message: `Route ${req.method} ${req.originalUrl} not found` },
  });
}

// Global error handler. Throws or `next(err)` from any route lands here.
// In dev, include the stack to make debugging fast. In prod, hide it.
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({
    error: {
      message: err.message || 'Internal server error',
      ...(err.details ? { details: err.details } : {}),
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
}
