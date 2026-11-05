const AppError = require("../utils/AppError");

function createRateLimiter(options = {}) {
    const windowMs = options.windowMs || Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
    const maxRequests = options.max || Number(process.env.RATE_LIMIT_MAX) || 300;
    const message = options.message || "Too many requests. Please try again later.";

    const hits = new Map();

    // Periodically clean up old entries
    setInterval(() => {
        const now = Date.now();
        for (const [key, data] of hits.entries()) {
            if (now - data.resetTime > 0) {
                hits.delete(key);
            }
        }
    }, windowMs).unref();

    return function rateLimitMiddleware(req, res, next) {
        const key = req.ip || req.connection.remoteAddress || "global";
        const now = Date.now();

        let client = hits.get(key);
        if (!client || now > client.resetTime) {
            client = { count: 1, resetTime: now + windowMs };
            hits.set(key, client);
        } else {
            client.count += 1;
        }

        res.setHeader("X-RateLimit-Limit", maxRequests);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - client.count));
        res.setHeader("X-RateLimit-Reset", Math.ceil(client.resetTime / 1000));

        if (client.count > maxRequests) {
            return next(new AppError(message, 429));
        }

        next();
    };
}

const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: "Too many requests from this IP. Please try again after 15 minutes."
});

const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: "Too many authentication attempts. Please try again after 15 minutes."
});

module.exports = { createRateLimiter, apiLimiter, authLimiter };
