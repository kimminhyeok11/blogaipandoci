// Simple in-memory rate limiter for API routes
// NOTE: This is per-instance. For multi-instance deployments, use Redis (Upstash, etc.)

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitMap.entries());
  for (const [key, entry] of entries) {
    if (entry.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Simple rate limiter based on IP + action
 * @param identifier - IP address or user ID
 * @param action - Action type (e.g., 'comment', 'login')
 * @param maxRequests - Max requests allowed in window (default: 60)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 */
export function checkRateLimit(
  identifier: string,
  action: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): RateLimitResult {
  const key = `${identifier}:${action}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetTime < now) {
    // First request or window expired
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(key, newEntry);

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Check if limit exceeded
  if (!entry || entry.count >= maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetTime: entry?.resetTime || now + windowMs,
    };
  }

  // Increment count
  entry.count++;

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIP = forwarded.split(",")[0];
    if (firstIP) {
      return firstIP.trim();
    }
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback to a default (for localhost/testing)
  return "unknown";
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
  };
}
