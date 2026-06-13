import { describe, it, expect, vi } from 'vitest';
import { CategoryService } from '../category.service';

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: Object.assign(vi.fn().mockReturnThis(), { join: vi.fn() }),
}));

describe('Core-Services: CategoryService', () => {
  it('hasCycle: returns true when cycle is detected', async () => {
    const mockDb = {
      run: vi.fn().mockResolvedValue({
        results: [
          { id: 'cat_1', parent_id: 'cat_2' },
          { id: 'cat_2', parent_id: 'cat_1' }
        ]
      })
    };

    const result = await CategoryService.hasCycle(mockDb as any, 'cat_1', 'cat_2');
    expect(result).toBe(true);
  });

  it('hasCycle: returns false when no cycle is detected', async () => {
    const mockDb = {
      run: vi.fn().mockResolvedValue({ results: [] })
    };

    const result = await CategoryService.hasCycle(mockDb as any, 'cat_1', 'cat_3');
    expect(result).toBe(false);
  });
});
