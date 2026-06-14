import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheService } from '../cache.service';

describe('CacheService', () => {
  let mockKV: any;
  let env: any;

  beforeEach(() => {
    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    env = { CACHE_KV: mockKV };
  });

  describe('Generation Tagging', () => {
    it('returns default generation 1 if not set', async () => {
      mockKV.get.mockResolvedValue(null);
      const gen = await CacheService.getGeneration(env);
      expect(gen).toBe('1');
      expect(mockKV.get).toHaveBeenCalledWith('catalog_generation');
    });

    it('returns stored generation', async () => {
      mockKV.get.mockResolvedValue('5');
      const gen = await CacheService.getGeneration(env);
      expect(gen).toBe('5');
    });

    it('increments generation correctly', async () => {
      mockKV.get.mockResolvedValue('2');
      const next = await CacheService.incrementGeneration(env);
      
      expect(next).toBe('3');
      expect(mockKV.put).toHaveBeenCalledWith('catalog_generation', '3');
    });
  });

  describe('Key Generation', () => {
    it('generates item key correctly', () => {
      expect(CacheService.getItemKey('test-slug')).toBe('catalog:item:test-slug');
    });

    it('generates list key with sorted query params', () => {
      const key = CacheService.getListKey('2', { b: '2', a: '1' });
      expect(key).toBe('catalog:list:v2:a=1&b=2');
    });

    it('generates fallback list key if no params', () => {
      const key = CacheService.getListKey('3', {});
      expect(key).toBe('catalog:list:v3:all');
    });
  });

  describe('Cache Operations', () => {
    it('handles undefined CACHE_KV gracefully', async () => {
      const emptyEnv = {};
      const res = await CacheService.getCachedItem(emptyEnv as any, 'test');
      expect(res).toBeNull();
    });

    it('gets cached item', async () => {
      mockKV.get.mockResolvedValue({ name: 'Test' });
      const res = await CacheService.getCachedItem(env, 'test');
      expect(res).toEqual({ name: 'Test' });
      expect(mockKV.get).toHaveBeenCalledWith('catalog:item:test', 'json');
    });

    it('sets cached list with TTL', async () => {
      await CacheService.setCachedList(env, '1', { q: 'shoes' }, { id: 1 });
      expect(mockKV.put).toHaveBeenCalledWith(
        'catalog:list:v1:q=shoes',
        '{"id":1}',
        { expirationTtl: 604800 }
      );
    });
  });

  describe('Product Invalidation', () => {
    it('deletes item cache and increments generation', async () => {
      mockKV.get.mockResolvedValue('1'); // Current generation
      
      await CacheService.invalidateProductCache(env, 'test-slug');
      
      expect(mockKV.delete).toHaveBeenCalledWith('catalog:item:test-slug');
      expect(mockKV.put).toHaveBeenCalledWith('catalog_generation', '2');
    });
  });
});
