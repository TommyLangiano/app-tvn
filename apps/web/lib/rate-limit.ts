import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 🔒 SECURITY #65: Fail hard in production if Redis not configured
// In production, we MUST have Redis for proper rate limiting across instances
const isProduction = process.env.NODE_ENV === 'production';
const hasRedisConfig = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

if (isProduction && !hasRedisConfig) {
  throw new Error('🚨 CRITICAL: Redis must be configured in production for rate limiting. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
}

// Create Redis instance
const redis = hasRedisConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : undefined;

// In-memory fallback for development (WARNING: not distributed, resets on restart)
class InMemoryRateLimiter {
  private cache = new Map<string, { count: number; reset: number }>();

  async limit(identifier: string, maxRequests: number, windowMs: number) {
    const now = Date.now();
    const key = identifier;
    const entry = this.cache.get(key);

    if (!entry || now > entry.reset) {
      // Create new window
      this.cache.set(key, { count: 1, reset: now + windowMs });
      return { success: true, limit: maxRequests, remaining: maxRequests - 1, reset: now + windowMs };
    }

    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      return { success: false, limit: maxRequests, remaining: 0, reset: entry.reset };
    }

    // Increment count
    entry.count++;
    this.cache.set(key, entry);
    return { success: true, limit: maxRequests, remaining: maxRequests - entry.count, reset: entry.reset };
  }
}

const inMemoryLimiter = new InMemoryRateLimiter();

// Rate limiters for different endpoints
export const loginRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
      analytics: true,
      prefix: '@ratelimit/login',
    })
  : null;

export const signupRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 signups per hour per IP
      analytics: true,
      prefix: '@ratelimit/signup',
    })
  : null;

export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
      analytics: true,
      prefix: '@ratelimit/api',
    })
  : null;

export const fileUploadRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 uploads per hour
      analytics: true,
      prefix: '@ratelimit/upload',
    })
  : null;

// Fallback rate limiter using in-memory cache
export async function checkRateLimit(
  identifier: string,
  type: 'login' | 'signup' | 'api' | 'upload'
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  if (!redis) {
    // Development fallback
    console.warn('[Rate Limit] Using in-memory rate limiter (not suitable for production)');

    const limits = {
      login: { max: 5, window: 15 * 60 * 1000 }, // 5 per 15min
      signup: { max: 3, window: 60 * 60 * 1000 }, // 3 per hour
      api: { max: 100, window: 60 * 1000 }, // 100 per min
      upload: { max: 10, window: 60 * 60 * 1000 }, // 10 per hour
    };

    const config = limits[type];
    return inMemoryLimiter.limit(identifier, config.max, config.window);
  }

  // Production rate limiting
  let limiter;
  switch (type) {
    case 'login':
      limiter = loginRateLimiter;
      break;
    case 'signup':
      limiter = signupRateLimiter;
      break;
    case 'upload':
      limiter = fileUploadRateLimiter;
      break;
    default:
      limiter = apiRateLimiter;
  }

  if (!limiter) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const result = await limiter.limit(identifier);
  return result;
}

// Helper to get client IP from request
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback (not reliable in production)
  return 'unknown';
}
