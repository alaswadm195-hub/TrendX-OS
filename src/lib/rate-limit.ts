type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 10_000;
const CLEANUP_INTERVAL = 250;

let checksSinceCleanup = 0;

function cleanupExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  /*
   * Defensive memory cap.
   * In normal operation expired entries are removed first.
   * If the map is still too large, remove the oldest entries.
   */
  if (buckets.size > MAX_BUCKETS) {
    const overflow =
      buckets.size - MAX_BUCKETS;

    let removed = 0;

    for (const key of buckets.keys()) {
      buckets.delete(key);
      removed += 1;

      if (removed >= overflow) {
        break;
      }
    }
  }
}

function normalizeIp(value: string | null) {
  if (!value) {
    return null;
  }

  const ip = value.trim();

  if (!ip || ip.length > 100) {
    return null;
  }

  /*
   * Basic normalization only.
   * The deployment proxy/load balancer remains responsible for overwriting
   * forwarding headers so clients cannot spoof them directly.
   */
  return ip.toLowerCase();
}

export function getClientIp(req: Request) {
  /*
   * Prefer infrastructure-specific headers first.
   *
   * - cf-connecting-ip: Cloudflare
   * - x-real-ip: common reverse proxies
   * - x-forwarded-for: first hop/original client when set by a trusted proxy
   *
   * IMPORTANT:
   * In production, the reverse proxy/platform must overwrite these headers.
   * Never expose the application directly while trusting client-supplied
   * forwarding headers.
   */
  const cloudflareIp = normalizeIp(
    req.headers.get("cf-connecting-ip"),
  );

  if (cloudflareIp) {
    return cloudflareIp;
  }

  const realIp = normalizeIp(
    req.headers.get("x-real-ip"),
  );

  if (realIp) {
    return realIp;
  }

  const forwardedFor =
    req.headers
      .get("x-forwarded-for")
      ?.split(",")[0] ?? null;

  const forwardedIp =
    normalizeIp(forwardedFor);

  if (forwardedIp) {
    return forwardedIp;
  }

  /*
   * All requests without a resolvable IP share this bucket.
   * That is safer than silently disabling the limiter.
   */
  return "unknown";
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  if (
    !Number.isFinite(limit) ||
    limit <= 0 ||
    !Number.isFinite(windowMs) ||
    windowMs <= 0
  ) {
    throw new Error(
      "Invalid rate-limit configuration",
    );
  }

  const now = Date.now();

  checksSinceCleanup += 1;

  if (
    checksSinceCleanup >=
    CLEANUP_INTERVAL
  ) {
    cleanupExpiredBuckets(now);
    checksSinceCleanup = 0;
  }

  const normalizedKey =
    key.trim().slice(0, 500);

  if (!normalizedKey) {
    throw new Error(
      "Rate-limit key is required",
    );
  }

  const current =
    buckets.get(normalizedKey);

  if (
    !current ||
    current.resetAt <= now
  ) {
    buckets.set(
      normalizedKey,
      {
        count: 1,
        resetAt:
          now + windowMs,
      },
    );

    return {
      allowed: true,
      retryAfter: 0,
      remaining:
        Math.max(
          limit - 1,
          0,
        ),
      resetAt:
        now + windowMs,
    };
  }

  current.count += 1;

  const retryAfter =
    Math.max(
      Math.ceil(
        (current.resetAt -
          now) /
          1000,
      ),
      1,
    );

  if (
    current.count > limit
  ) {
    return {
      allowed: false,
      retryAfter,
      remaining: 0,
      resetAt:
        current.resetAt,
    };
  }

  return {
    allowed: true,
    retryAfter: 0,
    remaining:
      Math.max(
        limit -
          current.count,
        0,
      ),
    resetAt:
      current.resetAt,
  };
}
