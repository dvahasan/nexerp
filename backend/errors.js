/**
 * errors.js — NexINV friendly error resolver
 *
 * Converts raw MongoDB / Mongoose / JWT errors into short, readable messages
 * that are safe to show directly to the end user.
 *
 * Usage:
 *   const { friendly, statusFor } = require('./errors');
 *   catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
 */

// ── Duplicate-key field → human label ────────────────────────────────────────
const DUP_LABELS = {
  username:    'Username',
  email:       'Email address',
  code:        'Company code',
  sku:         'SKU',
  barcode:     'Barcode',
  companyCode: 'Company code',
};

// ── Mongoose validation field → human label ──────────────────────────────────
const FIELD_LABELS = {
  name:         'Name',
  nameEn:       'English name',
  username:     'Username',
  email:        'Email address',
  passwordHash: 'Password',
  password:     'Password',
  role:         'Role',
  companyId:    'Company',
  companyName:  'Company name',
  qty:          'Quantity',
  price:        'Price',
  type:         'Type',
  itemId:       'Item',
  userId:       'User',
};

// ── Extract the first duplicate field from an E11000 error ───────────────────
function dupField(err) {
  // keyValue is the most reliable source: { username: 'admin' }
  if (err.keyValue) {
    const key = Object.keys(err.keyValue)[0];
    return DUP_LABELS[key] || key;
  }
  // Fallback: parse the index name from the message
  const match = err.message.match(/index: (\w+)_1/);
  if (match) return DUP_LABELS[match[1]] || match[1];
  return 'Value';
}

// ── Convert any error to a user-facing string ─────────────────────────────────
function friendly(err) {
  if (!err) return 'An unexpected error occurred.';

  const code = err.code;
  const name = err.name;

  // MongoDB duplicate key
  if (code === 11000 || code === 11001) {
    const field = dupField(err);
    return `${field} is already taken. Please choose a different one.`;
  }

  // Mongoose ValidationError — collect all field messages
  if (name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => {
      const label = FIELD_LABELS[e.path] || e.path;
      if (e.kind === 'required') return `${label} is required.`;
      if (e.kind === 'enum')     return `${label} has an invalid value.`;
      if (e.kind === 'min')      return `${label} is too small.`;
      if (e.kind === 'max')      return `${label} is too large.`;
      return `${label}: ${e.message}`;
    });
    return messages.join(' ');
  }

  // Mongoose CastError (bad ObjectId, wrong type)
  if (name === 'CastError') {
    const label = FIELD_LABELS[err.path] || err.path;
    return `Invalid value for ${label}.`;
  }

  // JWT errors (shouldn't reach routes but just in case)
  if (name === 'JsonWebTokenError') return 'Invalid or expired session. Please log in again.';
  if (name === 'TokenExpiredError') return 'Your session has expired. Please log in again.';

  // Mongoose disconnect / network
  if (name === 'MongoNetworkError' || name === 'MongooseServerSelectionError') {
    return 'Database connection error. Please try again shortly.';
  }

  // Generic mongoose/mongo error with a code we don't handle specifically
  if (code) return `Database error (${code}). Please try again.`;

  // Last resort — return the raw message but strip anything that looks like
  // internal paths, schema names, or "Path `field`" wording
  const raw = err.message || String(err);
  const cleaned = raw
    .replace(/Path `(\w+)`/gi, (_, f) => FIELD_LABELS[f] || f)
    .replace(/\bvalidation failed:\s*/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned || 'An unexpected error occurred.';
}

// ── Pick an appropriate HTTP status code for an error ────────────────────────
function statusFor(err) {
  if (!err) return 500;
  const code = err.code;
  const name = err.name;

  if (code === 11000 || code === 11001)  return 409; // Conflict
  if (name === 'ValidationError')        return 400; // Bad Request
  if (name === 'CastError')              return 400;
  if (name === 'JsonWebTokenError')      return 401;
  if (name === 'TokenExpiredError')      return 401;
  if (name === 'MongoNetworkError' ||
      name === 'MongooseServerSelectionError') return 503;

  return 500;
}

module.exports = { friendly, statusFor };
