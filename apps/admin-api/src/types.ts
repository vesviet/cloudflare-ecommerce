/// <reference types="@cloudflare/workers-types" />
export type Bindings = {
  DB: D1Database;
  PRODUCTS_R2: R2Bucket;
  CMS_R2: R2Bucket;
  ENVIRONMENT: string;
  CACHE_KV: KVNamespace;
  EVENT_QUEUE: Queue;
  ALLOWED_ADMIN_ORIGINS?: string;
  STRIPE_SECRET_KEY?: string;
  TEAM_DOMAIN?: string;
  AUDIENCE_TAG?: string;
  LOCAL_DEV?: string;
};

export type { CouponDTO } from './routes/coupons';
