import { Hono } from 'hono';

export const getFeatureFlags = async (kv: KVNamespace): Promise<Record<string, boolean>> => {
  try {
    const rawFlags = await kv.get('feature_flags');
    const flags = rawFlags ? JSON.parse(rawFlags) : {};
    
    // Default fallback values
    const defaultFlags = {
      'rma_self_service': false
    };

    return { ...defaultFlags, ...flags };
  } catch (e) {
    return { 'rma_self_service': false };
  }
};

export const featureFlagsRoute = new Hono<{ Bindings: { CACHE_KV: KVNamespace } }>();

featureFlagsRoute.get('/feature-flags', async (c) => {
  const flags = await getFeatureFlags(c.env.CACHE_KV);
  return c.json({ success: true, data: flags });
});
