import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Standard 429 response shape matches our error contract.
function handler(req, res) {
  res.status(429).json({
    error: {
      message: 'Too many requests. Please slow down and try again in a minute.',
    },
  });
}

// Keys by authenticated user id when available, otherwise IP. The library's
// `ipKeyGenerator` properly subnets IPv6 so attackers can't cycle the low
// 64 bits to bypass per-IP limits.
function userOrIpKey(req, res) {
  return req.user?._id ? `u:${req.user._id}` : ipKeyGenerator(req.ip);
}

// Catch-all limiter mounted at app level. Generous for normal browsing but
// stops bot-like traffic.
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Protects signup/login from credential stuffing. Per IP because unauth.
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  message: 'Too many auth attempts. Try again in a minute.',
});

// Guards AI generations — each call costs provider quota. Per-user
// because we don't want one account burning the whole budget.
const llmLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: (req, res) =>
    res.status(429).json({
      error: {
        message:
          "You've hit the AI request cap for this hour (30). Give it a few minutes before trying again.",
      },
    }),
});

// Call after validating an AI request and checking its cache. This ensures
// cached reads and invalid requests do not consume the user's generation cap.
export function enforceLlmLimit(req, res) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (allowed) => {
      if (settled) return;
      settled = true;
      res.off('finish', onFinished);
      res.off('close', onClosed);
      resolve(allowed);
    };
    const onFinished = () => finish(false);
    const onClosed = () => finish(false);

    res.once('finish', onFinished);
    res.once('close', onClosed);
    llmLimiter(req, res, (err) => {
      if (settled) return;
      if (err) {
        settled = true;
        res.off('finish', onFinished);
        res.off('close', onClosed);
        reject(err);
        return;
      }
      finish(true);
    });
  });
}
