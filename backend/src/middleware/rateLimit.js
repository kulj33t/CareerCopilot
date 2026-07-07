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
  return req.user?._id ? `u:${req.user._id}` : ipKeyGenerator(req, res);
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

// Guards anything that hits Gemini — each call costs real quota. Per-user
// because we don't want one account burning the whole budget.
export const llmLimiter = rateLimit({
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
