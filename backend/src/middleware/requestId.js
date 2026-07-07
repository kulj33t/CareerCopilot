import { randomUUID } from 'node:crypto';

// Attaches a short random id to every request so logs can be correlated. Also
// mirrors the id back in the `X-Request-Id` response header — lets the
// frontend include it when the user reports a bug.
export function requestId(req, res, next) {
  const existing = req.header('X-Request-Id');
  req.id = existing && existing.length <= 64 ? existing : randomUUID().split('-')[0];
  res.setHeader('X-Request-Id', req.id);
  next();
}
