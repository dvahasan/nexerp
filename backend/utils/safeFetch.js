const dns = require("dns").promises;
const net = require("net");
const { httpError } = require("../errors");

const MAX_REDIRECTS = 3;

// Addresses a server-side fetch must never reach: loopback, private ranges,
// link-local (incl. the 169.254.169.254 cloud metadata endpoint), CGNAT,
// multicast/reserved, and their IPv6 equivalents.
function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v6);
}

async function assertPublicUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw httpError(400, "Invalid URL"); }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw httpError(400, "Only http and https URLs are allowed");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addrs = net.isIP(host)
    ? [{ address: host }]
    : await dns.lookup(host, { all: true }).catch(() => { throw httpError(400, "Could not resolve host"); });
  if (addrs.length === 0 || addrs.some((a) => isPrivateAddress(a.address)))
    throw httpError(400, "URL points to a private or reserved address");
  return url;
}

/**
 * Fetch a remote image for re-upload, refusing internal destinations.
 * Redirects are followed manually so every hop is re-validated.
 */
async function fetchPublicImage(rawUrl, { maxBytes = 10 * 1024 * 1024, timeoutMs = 9000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = rawUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const url = await assertPublicUrl(current);
      const res = await fetch(url, { redirect: "manual", signal: controller.signal });

      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        current = new URL(res.headers.get("location"), url).toString();
        continue;
      }
      if (!res.ok) throw httpError(400, `Could not fetch image (HTTP ${res.status})`);

      const type = res.headers.get("content-type") || "";
      if (!type.startsWith("image/")) throw httpError(400, "URL did not return an image");
      const declared = Number(res.headers.get("content-length") || 0);
      if (declared > maxBytes) throw httpError(400, "Image is too large");

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > maxBytes) throw httpError(400, "Image is too large");
      return buffer;
    }
    throw httpError(400, "Too many redirects");
  } catch (e) {
    if (e.name === "AbortError") throw httpError(400, "Timed out fetching image");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchPublicImage, isPrivateAddress };
