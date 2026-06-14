export interface CacheBindings {
  CACHE_KV: KVNamespace;
}

export class CacheService {
  private static readonly GENERATION_KEY = 'catalog_generation';
  // Cache for 7 days (604800 seconds) - generation incrementing is the real invalidation mechanism
  private static readonly TTL_SECONDS = 604800; 

  /**
   * Retrieves the current catalog cache generation.
   */
  static async getGeneration(env: CacheBindings): Promise<string> {
    if (!env.CACHE_KV) return '1';
    const gen = await env.CACHE_KV.get(this.GENERATION_KEY);
    return gen || '1';
  }

  /**
   * Increments the catalog generation, instantly invalidating all list-based caches.
   */
  static async incrementGeneration(env: CacheBindings): Promise<string> {
    if (!env.CACHE_KV) return '1';
    const current = await this.getGeneration(env);
    const next = (parseInt(current, 10) + 1).toString();
    await env.CACHE_KV.put(this.GENERATION_KEY, next);
    return next;
  }

  /**
   * Generates a cache key for a specific item.
   * Item caches do not use generation tagging since they can be deleted directly.
   */
  static getItemKey(slug: string): string {
    return `catalog:item:${slug}`;
  }

  /**
   * Generates a cache key for a catalog list (search, categories, front page).
   * Incorporates the generation tag for O(1) invalidation.
   */
  static getListKey(generation: string, queryParams: Record<string, string>): string {
    // Sort keys to ensure consistent cache hits regardless of param order
    const sortedQuery = Object.keys(queryParams)
      .sort()
      .map(k => `${k}=${queryParams[k]}`)
      .join('&');
    return `catalog:list:v${generation}:${sortedQuery || 'all'}`;
  }

  static async getCachedItem(env: CacheBindings, slug: string): Promise<any | null> {
    if (!env.CACHE_KV) return null;
    const data = await env.CACHE_KV.get(this.getItemKey(slug), 'json');
    return data || null;
  }

  static async setCachedItem(env: CacheBindings, slug: string, data: any): Promise<void> {
    if (!env.CACHE_KV) return;
    await env.CACHE_KV.put(this.getItemKey(slug), JSON.stringify(data), {
      expirationTtl: this.TTL_SECONDS,
    });
  }

  static async getCachedList(env: CacheBindings, generation: string, queryParams: Record<string, string>): Promise<any | null> {
    if (!env.CACHE_KV) return null;
    const data = await env.CACHE_KV.get(this.getListKey(generation, queryParams), 'json');
    return data || null;
  }

  static async setCachedList(env: CacheBindings, generation: string, queryParams: Record<string, string>, data: any): Promise<void> {
    if (!env.CACHE_KV) return;
    await env.CACHE_KV.put(this.getListKey(generation, queryParams), JSON.stringify(data), {
      expirationTtl: this.TTL_SECONDS,
    });
  }

  /**
   * Called by Admin API when a product is modified (created, updated, deleted).
   * Instantly deletes the specific item cache and bumps the generation to invalidate lists.
   */
  static async invalidateProductCache(env: CacheBindings, slug: string): Promise<void> {
    if (!env.CACHE_KV) return;
    await Promise.all([
      env.CACHE_KV.delete(this.getItemKey(slug)),
      this.incrementGeneration(env),
    ]);
  }
}
