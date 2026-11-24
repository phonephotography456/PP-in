// In-memory fixed-window limiter. Per-instance only: swap the Map for a shared store
// (Redis/DB) before running more than one server instance.
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  entry.count += 1;
  return entry.count <= limit
    ? { ok: true, retryAfter: 0 }
    : { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
}

/**
 * Client IP for rate limiting. X-Forwarded-For is client-controlled unless a trusted proxy appends to it, so the
 * first entry is spoofable (a fresh fake IP per request would bypass every per-IP bucket). Count TRUSTED_PROXY_HOPS
 * proxies from the right instead (default 1: one reverse proxy/CDN in front). Set 0 when the app is exposed directly:
 * the header is then ignored.
 */
export function clientIp(req: Request) {
  const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  if (!(hops > 0)) return "direct";
  const chain = (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return chain[chain.length - hops] || req.headers.get("x-real-ip") || "unknown";
}

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Limits per action: [perIp, perEmail, windowMs]. */
export const LIMITS = {
  register: [10, 3, HOUR],
  verify: [20, 5, 15 * MIN],
  login: [20, 5, 15 * MIN],
  forgot: [10, 3, HOUR],
  reset: [20, 5, 15 * MIN],
} as const;

/** Returns a 429 Response when the IP or email bucket is exhausted, else null. */
export function limited(req: Request, action: keyof typeof LIMITS, email: string) {
  const [ipMax, emailMax, win] = LIMITS[action];
  const checks = [
    rateLimit(`${action}:ip:${clientIp(req)}`, ipMax, win),
    rateLimit(`${action}:email:${email.toLowerCase()}`, emailMax, win),
  ];
  const hit = checks.find((c) => !c.ok);
  if (!hit) return null;
  return Response.json(
    { error: "Too many attempts. Please try again later." },
    { status: 429, headers: { "Retry-After": String(hit.retryAfter) } },
  );
}
