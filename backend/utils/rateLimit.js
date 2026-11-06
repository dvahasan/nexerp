/**
 * Minimal fixed-window in-memory rate limiter (per IP + route).
 * Suitable for a single-instance deployment; swap for a Redis-backed
 * limiter if the API is ever scaled horizontally.
 */
const buckets = new Map();

// Periodically drop expired windows so the map doesn't grow unbounded
const SWEEP_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}, SWEEP_MS).unref();

const clientIp = (req) => {
  let ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "unknown";
  if (typeof ip === "string" && ip.includes(",")) ip = ip.split(",")[0].trim();
  return ip;
};

/**
 * @param {Object} opts
 * @param {number} opts.windowMs  window length in ms
 * @param {number} opts.max       max requests per window per IP
 * @param {string} [opts.message] error message on 429
 */
const rateLimit = ({ windowMs, max, message }) => (req, res, next) => {
  const key = `${clientIp(req)}|${req.baseUrl}${req.path}`;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > max) {
    res.setHeader("Retry-After", Math.ceil((b.resetAt - now) / 1000));
    return res.status(429).json({ message: message || "Too many requests, please try again later" });
  }
  next();
};

module.exports = { rateLimit };
