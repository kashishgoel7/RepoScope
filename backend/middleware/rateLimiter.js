import rateLimit from 'express-rate-limit';

export const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each user (or IP if unauthenticated) to 5 requests per hour
  keyGenerator: (req) => {
    // If the request goes through the 'protect' middleware first, req.user will be set.
    // We rate limit by userId, falling back to IP.
    return req.user ? req.user.id.toString() : req.ip;
  },
  handler: (req, res, next, options) => {
    res.status(429).json({
      message: options.message.message || 'Too many requests, please try again later.',
    });
  },
  message: {
    message: 'Too many repository analyses. You can analyze up to 5 repositories per hour.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// A general limiter to prevent brute force attacks on auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
