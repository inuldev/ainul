// Rate limiting middleware untuk mencegah spam requests
const rateLimitStore = new Map();

const rateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute default
    maxRequests = 10, // 10 requests per window default
    message = "Terlalu banyak permintaan, silakan coba lagi nanti",
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Clean up old entries
    for (const [ip, data] of rateLimitStore.entries()) {
      if (now - data.resetTime > windowMs) {
        rateLimitStore.delete(ip);
      }
    }

    // Get or create rate limit data for this IP
    let rateLimitData = rateLimitStore.get(key);

    if (!rateLimitData || now - rateLimitData.resetTime > windowMs) {
      rateLimitData = {
        count: 0,
        resetTime: now,
        firstRequest: now,
      };
      rateLimitStore.set(key, rateLimitData);
    }

    // Check if limit exceeded
    if (rateLimitData.count >= maxRequests) {
      const timeUntilReset = Math.ceil(
        (rateLimitData.resetTime + windowMs - now) / 1000
      );

      return res.status(429).json({
        success: false,
        message: message,
        retryAfter: timeUntilReset,
        limit: maxRequests,
        remaining: 0,
        resetTime: new Date(rateLimitData.resetTime + windowMs).toISOString(),
      });
    }

    // Increment counter
    rateLimitData.count++;

    // Add rate limit headers
    res.set({
      "X-RateLimit-Limit": maxRequests,
      "X-RateLimit-Remaining": Math.max(0, maxRequests - rateLimitData.count),
      "X-RateLimit-Reset": new Date(
        rateLimitData.resetTime + windowMs
      ).toISOString(),
    });

    // Store original end function to track response status
    const originalEnd = res.end;
    res.end = function (...args) {
      const statusCode = res.statusCode;

      // Optionally skip counting successful/failed requests
      if (
        (skipSuccessfulRequests && statusCode < 400) ||
        (skipFailedRequests && statusCode >= 400)
      ) {
        rateLimitData.count--;
      }

      originalEnd.apply(this, args);
    };

    next();
  };
};

// Specific rate limiters for different endpoints
export const assistantRateLimit = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute for assistant
  message: "Terlalu banyak permintaan ke asisten, silakan tunggu sebentar",
});

export const authRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: "Terlalu banyak percobaan login, silakan coba lagi dalam 15 menit",
});

export const generalRateLimit = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute general
  message: "Terlalu banyak permintaan, silakan tunggu sebentar",
});

export default rateLimiter;
