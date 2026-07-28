import type { Context, MiddlewareHandler, Next } from 'hono';

export type RateLimiter = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
};

type RateLimitOptions = {
  /** Name of the rate limiter binding on `c.env`. */
  binding: string;
  /** Namespaces the counter so different routes never share a bucket. */
  scope: string;
  /** Resolves the identity being limited. Return null to skip limiting. */
  key: (c: Context<any>) => string | null | undefined | Promise<string | null | undefined>;
  /** Seconds advertised to the client in Retry-After. Should match the binding period. */
  retryAfterSeconds?: number;
  message?: string;
};

const warnedBindings = new Set<string>();

/**
 * Falls back to the client IP so unauthenticated routes still get a bucket.
 */
export const clientIp = (c: Context<any>): string =>
  c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown-ip';

/**
 * Rate limits a route using a Cloudflare rate limiting binding.
 * When the binding is absent (local dev, tests) the request is allowed through.
 */
export const rateLimit = (options: RateLimitOptions): MiddlewareHandler<any> => {
  const {
    binding,
    scope,
    key,
    retryAfterSeconds = 60,
    message = 'Too many requests. Please try again later.',
  } = options;

  return async (c: Context<any>, next: Next) => {
    const limiter = (c.env as Record<string, unknown> | undefined)?.[binding] as RateLimiter | undefined;

    if (!limiter || typeof limiter.limit !== 'function') {
      if (!warnedBindings.has(binding)) {
        warnedBindings.add(binding);
        console.warn(`[RateLimit] Binding ${binding} is unavailable — requests are not being limited`);
      }
      return next();
    }

    const identity = await key(c);
    if (!identity) {
      return next();
    }

    try {
      const { success } = await limiter.limit({ key: `${scope}:${identity}` });
      if (!success) {
        console.warn(`[RateLimit] Blocked request on scope=${scope}`);
        c.header('Retry-After', String(retryAfterSeconds));
        return c.json({ success: false, error: message }, 429);
      }
    } catch (err) {
      // Never let limiter failures take down the route it protects.
      console.error(`[RateLimit] Limiter ${binding} failed, allowing request:`, err);
    }

    return next();
  };
};
