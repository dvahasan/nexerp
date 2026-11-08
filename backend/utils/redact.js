// Field names whose values must never reach the audit log. Matched
// case-insensitively against every key at any depth.
const SENSITIVE = /pass(word)?|hash|token|secret|apikeys?|^key$|email|phone|address|card|iban/i;

const MAX_STRING = 200;
const MAX_DEPTH = 4;

/** Copy of a request body that is safe to store in ActionLog. */
function redactBody(value, depth = 0) {
  if (value == null) return value;
  if (depth > MAX_DEPTH) return "[…]";
  if (typeof value === "string") return value.length > MAX_STRING ? value.slice(0, MAX_STRING) + "…" : value;
  if (Array.isArray(value)) {
    const out = value.slice(0, 20).map((v) => redactBody(v, depth + 1));
    if (value.length > 20) out.push(`[+${value.length - 20} more]`);
    return out;
  }
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE.test(k) ? "[redacted]" : redactBody(v, depth + 1);
    }
    return out;
  }
  return value;
}

module.exports = { redactBody };
